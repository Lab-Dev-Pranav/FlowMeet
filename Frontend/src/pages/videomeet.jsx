import React, { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import "./videomeet.css";
import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import VideocamOffIcon from '@mui/icons-material/VideocamOff'

const serverUrl = import.meta.env.VITE_SERVER_URL || "http://localhost:3000";

const peerConfigConnections = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' }
  ]
};

function VideoMeet() {
  // Refs
  const socketRef = useRef(null);
  const socketIdRef = useRef(null);
  const localVideoRef = useRef(null);
  const videoRef = useRef([]);
  const connectionsRef = useRef({});

  // State
  const [videoAvailable, setVideoAvailable] = useState(false);
  const [audioAvailable, setAudioAvailable] = useState(false);
  const [video, setVideo] = useState(false);
  const [audio, setAudio] = useState(false);
  const [screen, setScreen] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [screenAvailable, setScreenAvailable] = useState(false);
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState("");
  const [newMessage, setNewMessage] = useState(null);
  const [askForUsername, setAskForUsername] = useState(true);
  const [username, setUsername] = useState("");
  const [videos, setVideos] = useState([]);

  // ✅ FIXED: Get initial permissions with local variables
  const getPermissions = async () => {
    try {
      let hasVideo = false;
      let hasAudio = false;

      // Check video permission
      try {
        const videoStream = await navigator.mediaDevices.getUserMedia({ video: true });
        hasVideo = true;
        setVideoAvailable(true);
        videoStream.getTracks().forEach(track => track.stop());
      } catch (err) {
        console.log("Video not available:", err);
        setVideoAvailable(false);
      }

      // Check audio permission
      try {
        const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        hasAudio = true;
        setAudioAvailable(true);
        audioStream.getTracks().forEach(track => track.stop());
      } catch (err) {
        console.log("Audio not available:", err);
        setAudioAvailable(false);
      }

      // Check screen share availability
      if (navigator.mediaDevices.getDisplayMedia) {
        setScreenAvailable(true);
      } else {
        setScreenAvailable(false);
      }

      // ✅ FIXED: Use local variables instead of state values
      // Get user media for preview
      if (hasVideo || hasAudio) {
        try {
          const userMediaStream = await navigator.mediaDevices.getUserMedia({
            video: hasVideo,
            audio: hasAudio
          });

          if (userMediaStream) {
            window.localStream = userMediaStream;
            if (localVideoRef.current) {
              localVideoRef.current.srcObject = userMediaStream;
            }
          }
        } catch (err) {
          console.log("Error getting user media:", err);
        }
      }
    } catch (err) {
      console.error("Error getting permissions:", err);
    }
  };

  useEffect(() => {
    getPermissions();
  }, []);

  // Create black video track
  const createBlackVideoTrack = ({ width = 640, height = 480 } = {}) => {
    const canvas = Object.assign(document.createElement('canvas'), { width, height });
    canvas.getContext('2d').fillRect(0, 0, width, height);
    const stream = canvas.captureStream();
    return Object.assign(stream.getVideoTracks()[0], { enabled: false });
  };

  // Create silence audio track
  const createSilenceAudioTrack = () => {
    const ctx = new AudioContext();
    const oscillator = ctx.createOscillator();
    const dst = oscillator.connect(ctx.createMediaStreamDestination());
    oscillator.start();
    ctx.resume();
    return Object.assign(dst.stream.getAudioTracks()[0], { enabled: false });
  };

  // Create black silence stream
  const createBlackSilenceStream = (...args) => {
    return new MediaStream([createBlackVideoTrack(...args), createSilenceAudioTrack()]);
  };

  // Handle user media success
  const getUserMediaSuccess = (stream) => {
    try {
      // Stop existing tracks
      if (window.localStream) {
        window.localStream.getTracks().forEach(track => track.stop());
      }
    } catch (err) {
      console.error("Error stopping existing tracks:", err);
    }

    window.localStream = stream;
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = stream;
    }

    // Update all peer connections
    for (let id in connectionsRef.current) {
      if (id === socketIdRef.current) continue;

      try {
        // Remove old stream
        const senders = connectionsRef.current[id].getSenders();
        senders.forEach(sender => {
          connectionsRef.current[id].removeTrack(sender);
        });

        // Add new stream
        stream.getTracks().forEach(track => {
          connectionsRef.current[id].addTrack(track, stream);
        });

        // Create offer
        connectionsRef.current[id].createOffer()
          .then(description => {
            return connectionsRef.current[id].setLocalDescription(description);
          })
          .then(() => {
            socketRef.current.emit("signal", id, JSON.stringify({
              sdp: connectionsRef.current[id].localDescription
            }));
          })
          .catch(err => console.error("Error creating offer:", err));
      } catch (err) {
        console.error("Error updating peer connection:", err);
      }
    }

    // Handle track ending
    stream.getTracks().forEach(track => {
      track.onended = () => {
        setVideo(false);
        setAudio(false);

        try {
          if (localVideoRef.current && localVideoRef.current.srcObject) {
            const tracks = localVideoRef.current.srcObject.getTracks();
            tracks.forEach(t => t.stop());
          }
        } catch (err) {
          console.error("Error stopping tracks on end:", err);
        }

        // Replace with black silence
        const blackSilenceStream = createBlackSilenceStream();
        window.localStream = blackSilenceStream;
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = blackSilenceStream;
        }

        // Update all connections
        for (let id in connectionsRef.current) {
          try {
            const senders = connectionsRef.current[id].getSenders();
            senders.forEach(sender => {
              connectionsRef.current[id].removeTrack(sender);
            });

            blackSilenceStream.getTracks().forEach(track => {
              connectionsRef.current[id].addTrack(track, blackSilenceStream);
            });

            connectionsRef.current[id].createOffer()
              .then(description => {
                return connectionsRef.current[id].setLocalDescription(description);
              })
              .then(() => {
                socketRef.current.emit("signal", id, JSON.stringify({
                  sdp: connectionsRef.current[id].localDescription
                }));
              })
              .catch(err => console.error("Error in track end handler:", err));
          } catch (err) {
            console.error("Error updating connection on track end:", err);
          }
        }
      };
    });
  };

  // Get user media
  const getUserMedia = async () => {
    try {
      if ((video && videoAvailable) || (audio && audioAvailable)) {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: video && videoAvailable,
          audio: audio && audioAvailable
        });
        getUserMediaSuccess(stream);
      } else {
        // Stop all tracks
        try {
          if (localVideoRef.current && localVideoRef.current.srcObject) {
            const tracks = localVideoRef.current.srcObject.getTracks();
            tracks.forEach(track => track.stop());
          }
        } catch (err) {
          console.error("Error stopping tracks:", err);
        }

        // Set black silence
        const blackSilenceStream = createBlackSilenceStream();
        window.localStream = blackSilenceStream;
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = blackSilenceStream;
        }
      }
    } catch (err) {
      console.error("Error in getUserMedia:", err);
    }
  };

  // Update media when video/audio state changes
  useEffect(() => {
    if (video !== undefined && audio !== undefined && !askForUsername) {
      getUserMedia();
    }
  }, [video, audio, askForUsername]);

  // Handle signal from server
  const handleSignalFromServer = (fromId, message) => {
    try {
      const signal = JSON.parse(message);

      // ✅ FIXED: Process signals from OTHER users, not ourselves
      if (fromId !== socketIdRef.current) {
        if (!connectionsRef.current[fromId]) {
          console.warn("No connection found for:", fromId);
          return;
        }

        if (signal.sdp) {
          connectionsRef.current[fromId]
            .setRemoteDescription(new RTCSessionDescription(signal.sdp))
            .then(() => {
              if (signal.sdp.type === 'offer') {
                return connectionsRef.current[fromId].createAnswer();
              }
            })
            .then(description => {
              if (description) {
                return connectionsRef.current[fromId].setLocalDescription(description);
              }
            })
            .then(() => {
              if (signal.sdp.type === 'offer') {
                socketRef.current.emit("signal", fromId, JSON.stringify({
                  sdp: connectionsRef.current[fromId].localDescription
                }));
              }
            })
            .catch(err => console.error("Error handling SDP:", err));
        }

        if (signal.ice) {
          connectionsRef.current[fromId]
            .addIceCandidate(new RTCIceCandidate(signal.ice))
            .catch(err => console.error("Error adding ICE candidate:", err));
        }
      }
    } catch (err) {
      console.error("Error parsing signal:", err);
    }
  };

  // Add message handler
  const addMessage = (data, sender, socketIdSender) => {
    setMessages(prevMessages => {
      const path = sender;
      if (messages[path] === undefined) {
        messages[path] = [];
      }
      return [...prevMessages, { sender, data, socketIdSender }];
    });
    setNewMessage({ sender, data });
  };

  // Connect to socket server
  const connectToSocketServer = () => {
    socketRef.current = io(serverUrl, {
      secure: false,
      transports: ["websocket"]
    });

    socketRef.current.on('signal', handleSignalFromServer);

    socketRef.current.on('connect', () => {
      console.log("Connected to socket server");

      // ✅ FIXED: Emit from socketRef.current, not socketIdRef.current
      socketRef.current.emit('join_call', window.location.href);
      socketIdRef.current = socketRef.current.id;

      // Handle chat messages
      socketRef.current.on("chat_message", addMessage);

      // Handle user left
      socketRef.current.on("user-left", (id) => {
        console.log("User left:", id);

        // ✅ FIXED: Return the filtered array
        setVideos(prevVideos =>
          prevVideos.filter(video => video.socketId !== id)
        );

        // Close and remove connection
        if (connectionsRef.current[id]) {
          connectionsRef.current[id].close();
          delete connectionsRef.current[id];
        }
      });

      // Handle user joined
      socketRef.current.on("user_joined", (id, clients) => {
        console.log("User joined:", id, "Clients:", clients);

        clients.forEach(socketId => {
          // Create peer connection
          connectionsRef.current[socketId] = new RTCPeerConnection(peerConfigConnections);

          // Handle ICE candidates
          connectionsRef.current[socketId].onicecandidate = (event) => {
            if (event.candidate != null) {
              socketRef.current.emit("signal", socketId, JSON.stringify({
                ice: event.candidate
              }));
            }
          };

          // ✅ FIXED: Use modern ontrack instead of deprecated onaddstream
          connectionsRef.current[socketId].ontrack = (event) => {
            console.log("Track received from:", socketId, event.streams);
            if (event.streams && event.streams[0]) {
              const stream = event.streams[0];
              console.log('Received remote stream:', stream, 'for socket:', socketId);
              setVideos(prevVideos => {
                const existingIndex = prevVideos.findIndex(v => v.socketId === socketId);
                if (existingIndex !== -1) {
                  const updatedVideos = prevVideos.map((v, index) =>
                    index === existingIndex ? { ...v, stream } : v
                  );
                  videoRef.current = updatedVideos;
                  return updatedVideos;
                } else {
                  const newVideo = {
                    socketId,
                    stream,
                    autoPlay: true,
                    playsInline: true
                  };
                  const updatedVideos = [...prevVideos, newVideo];
                  videoRef.current = updatedVideos;
                  return updatedVideos;
                }
              });
            } else {
              console.warn('No streams found in ontrack event for', socketId, event);
            }
          };

          // Add local stream to connection
          // ✅ FIXED: Changed && to || and !== to check if stream exists
          if (window.localStream !== undefined && window.localStream !== null) {
            window.localStream.getTracks().forEach(track => {
              connectionsRef.current[socketId].addTrack(track, window.localStream);
            });
          } else {
            const blackSilenceStream = createBlackSilenceStream();
            window.localStream = blackSilenceStream;
            blackSilenceStream.getTracks().forEach(track => {
              connectionsRef.current[socketId].addTrack(track, blackSilenceStream);
            });
          }
        });

        // Create offers for all connections
        if (id === socketIdRef.current) {
          for (let socketId in connectionsRef.current) {
            if (socketId === socketIdRef.current) continue;

            try {
              connectionsRef.current[socketId]
                .createOffer()
                .then(description => {
                  return connectionsRef.current[socketId].setLocalDescription(description);
                })
                .then(() => {
                  socketRef.current.emit("signal", socketId, JSON.stringify({
                    sdp: connectionsRef.current[socketId].localDescription
                  }));
                })
                .catch(err => console.error("Error creating offer:", err));
            } catch (err) {
              console.error("Error in offer creation:", err);
            }
          }
        }
      });
    });

    socketRef.current.on('disconnect', () => {
      console.log("Disconnected from socket server");
    });

    socketRef.current.on('connect_error', (error) => {
      console.error("Socket connection error:", error);
    });
  };

  // Get media and connect
  const getMedia = () => {
    setAudio(audioAvailable);
    setVideo(videoAvailable);
    connectToSocketServer();
  };

  // Connect to call
  const connect = () => {
    if (!username.trim()) {
      alert("Please enter a username");
      return;
    }
    setAskForUsername(false);
    getMedia();
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Close all connections
      for (let id in connectionsRef.current) {
        connectionsRef.current[id].close();
      }

      // Stop all tracks
      if (window.localStream) {
        window.localStream.getTracks().forEach(track => track.stop());
      }

      // Disconnect socket
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, []);

  return (
    <div className="videomeet-main">
      {askForUsername ? (
        <div className="videomeet-row clearer-row">
          <div className="left-section">
            <h2 className="lobby-title">Enter into Lobby</h2>
            <TextField
              id="outlined-basic"
              label="Username"
              value={username}
              onChange={e => setUsername(e.target.value)}
              variant="outlined"
              fullWidth
              onKeyPress={e => e.key === 'Enter' && connect()}
            />
            <Button
              variant="contained"
              fullWidth
              onClick={connect}
              style={{ marginTop: '10px' }}
            >
              Connect
            </Button>
          </div>
          <div className="right-section">
            <div className="vedio-audio-check-box">
              <span className="check-title">Video/Audio Check</span>
              <video
                ref={localVideoRef}
                autoPlay
                muted
                playsInline
                className="check-video"
              />
            </div>
          </div>
        </div>
      ) : (
        <div className="video-meet-main-container">
          {/* Remote videos grid */}

          <div>

            <div className="remote-videos-grid">
              {videos.length === 0 && (
                <div style={{ color: '#fff', fontSize: '1.1rem', opacity: 0.7, marginTop: '2rem' }}>
                  No remote participants connected yet.
                </div>
              )}
              {videos.map((vdo) => (
                <div key={vdo.socketId} className="remote-video-wrapper">
                  <video
                    data-socket={vdo.socketId}
                    ref={ref => {
                      if (ref && vdo.stream) {
                        console.log('Setting srcObject for remote video:', vdo.socketId, vdo.stream);
                        ref.srcObject = vdo.stream;
                      }
                    }}
                    autoPlay
                    playsInline
                    className="remote-video-el"
                  />
                  <p className="remote-username-label">
                    User {vdo.socketId.substring(0, 6)}
                  </p>
                </div>
              ))}
            </div>
            {/* Local video overlay */}
            <div className="local-video-overlay">
              <video
                ref={localVideoRef}
                autoPlay
                muted
                playsInline
                className="local-video-el"
              />
              <p className="local-username-label">{username} (You)</p>
            </div>


          </div>



          {/* buttons */}
          <div className="controls-container">
              <IconButton>
                {(vdo === true) ? <VideocamIcon> </VideocamIcon> : <VideocamOffIcon></VideocamOffIcon>}
              </IconButton>
          </div>

        </div>
      )}
    </div>
  );
}

export default VideoMeet;