import React from 'react';
import { io } from 'socket.io-client';
const serverUrl = import.meta.env.VITE_SERVER_URL || "http://localhost:3000";
import "./videomeet.css";
import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import { Navigate } from 'react-router';
//imp useEffect
import { useEffect } from 'react';
// import { set } from 'mongoose';

var connections = {};
var perConfigConnections = {
      'iceServers': [
            { 'urls': 'stun:stun.l.google.com:19302' },
      ]
}

// Socket.IO connection function
// function connectToSocketServer() {
//   const socket = io(serverUrl, {
//     transports: ["websocket"],
//   });
//   // You can store socket in a ref or state if needed
//   return socket;
// }







function VideoMeet() {

      var socketRef = React.useRef();
      let socketIdRef = React.useRef();
      let localVedioRef = React.useRef();
      let [vedioAvailable, setVedioAvailable] = React.useState(true);
      let [audioAvailable, setAudioAvailable] = React.useState(true);
      let [vedio, setVedio] = React.useState([]);
      let [audio, setAudio] = React.useState();
      let [screen, setScreen] = React.useState();
      let [showModal, setShowModal] = React.useState(false);
      let [screenAvailable, setScreenAvailable] = React.useState(false);
      let [messages, setMessages] = React.useState([]);
      let [message, setMessage] = React.useState("");
      let [newMessage, setNewMessage] = React.useState();
      let [askForUsername, setAskForUsername] = React.useState(true);
      let [username, setUsername] = React.useState("");
      const videoRef = React.useRef();
      let [video, setVideo] = React.useState([]);






      // todo: check for chrome browser
      // if(isChrome()=== false){
      //       alert("This application works only on Google Chrome browser. Please switch to Google Chrome.");
      // }


      const getPermissions = async () => {
            try {
                  const useVideoPermissions = await navigator.mediaDevices.getUserMedia({ video: true });
                  if (useVideoPermissions) {
                        setVedioAvailable(true);
                  } else {
                        setVedioAvailable(false);
                  }

                  const useAudioPermissions = await navigator.mediaDevices.getUserMedia({ audio: true });
                  if (useAudioPermissions) {
                        setAudioAvailable(true);
                  } else {
                        setAudioAvailable(false);
                  }

                  if (navigator.mediaDevices.getDisplayMedia) {
                        setScreenAvailable(true);
                  } else {
                        setScreenAvailable(false);
                  }

                  if (useAudioPermissions || useVideoPermissions) {
                        const userMediaStream = await navigator.mediaDevices.getUserMedia({ video: vedioAvailable, audio: audioAvailable });
                        if (userMediaStream) {
                              window.localStream = userMediaStream;
                              if (localVedioRef.current) {
                                    localVedioRef.current.srcObject = userMediaStream;
                              }
                        }
                  }

            } catch (err) {
                  console.log("Error getting permissions: ", err);
            }
      }
      React.useEffect(() => {
            getPermissions();
      }, [])

      let getUserMediaSuccess = (stream) => {
            try {
                  window.localStream.getTracks().forEach((track) => {
                        track.stop();
                  });
            } catch (err) {
                  console.log("get user media success error", err);
            }
            window.localStream = stream;
            localVedioRef.current.srcObject = stream;
            for (let id in connections) {
                  if (id === socketIdRef.current) {
                        continue;
                  }
                  connections[id].addStream(window.localStream);

                  connections[id].createOffer().then((discreption) => {
                        connections[id].setLocalDescription(discreption)
                              .then(() => {
                                    socketRef.current.emit("signal", id, JSON.stringify({ 'sdp': connections[id].localDescription }));
                              })
                              .catch((err) => {
                                    console.log("set local description error", err);
                              })
                  })
            }

            stream.getTracks().forEach((track) => {
                  track.onended = () => {
                        setVedio(false);
                        setAudio(false);

                        try {
                              let tracks = localVedioRef.current.srcObject.getTracks();
                              tracks.forEach(track => track.stop());
                        } catch (err) {
                              console.log("Error stopping tracks", err);
                        }
                        // todo blacksilence

                        for (let id in connections) {
                              connections[id].addStream(window.localStream);
                              connections[id].createOffer().then((discreption) => {
                                    connections[id].setLocalDescription(discreption)
                                          .then(() => {
                                                socketRef.current.emit("signal", id, JSON.stringify({ 'sdp': connections[id].localDescription }));
                                          })
                                          .catch((err) => {
                                                console.log("set local description error", err);
                                          })
                              })
                        }
                  }
            })
      }

      let silence = () => {
            let ctx = new AudioContext();
            let oscillator = ctx.createOscillator();
            
      }

      let getUserMedia = async () => {
            try {
                  if ((video && vedioAvailable) || (audio && audioAvailable)) {
                        navigator.mediaDevices.getUserMedia({ video: vedio, audio: audio })
                              .then(() => { getUserMediaSuccess })
                              .then((stream) => { })
                              .catch((err) => console.log("media devices Error.", err));
                  } else {
                        try {
                              let tracks = localVedioRef.current.srcObject.getTracks();
                              tracks.forEach(track => track.stop());
                        } catch (err) { }

                  }
            } catch (err) {
            }
      }

      useEffect(() => {
            if (vedio !== undefined && audio !== undefined) {
                  getUserMedia();
            }
      }, [vedio, audio]);



      // dummy as vdoeo signal handler

      let gotmessagefromserver = (fromId, message) => {
            var signal = JSON.parse(message);
            if (fromId === socketIdRef.current) {
                  if (signal.sdp) {
                        connections[fromId].setRemoteDescription(new RTCSessionDescription(signal.sdp))
                              .then(() => {
                                    if (signal.sdp.type === 'offer') {
                                          connections[fromId].createAnswer()
                                                .then((discreption) => {
                                                      connections[fromId].setLocalDescription(discreption)
                                                            .then(() => {
                                                                  socketRef.current.emit("signal", fromId, JSON.stringify({ 'sdp': connections[fromId].localDescription }));
                                                            })
                                                            .catch((err) => {
                                                                  console.log("set local description error", err);
                                                            })
                                                })
                                                .catch((err) => {
                                                      console.log("create answer error", err);
                                                })
                                    }
                              })
                              .catch((err) => {
                                    console.log("set remote description error", err);
                              });
                  }

                  if (signal.ice) {
                        connections[fromId].addIceCandidate(new RTCIceCandidate(signal.ice))
                              .catch((err) => {
                                    console.log("add ice candidate error", err);
                              });
                  }
            }
      }


      //    todo addnewmsg
      let addMessage = () => {

      }


      let connectToSocketServer = () => {
            socketRef.current = io(serverUrl, { secure: false });
            socketRef.current.on('signal', gotmessagefromserver);
            socketRef.current.on('connect', () => {
                  socketIdRef.current.emit('join_call', window.location.href);
                  socketIdRef.current = socketRef.current.id;
                  socketRef.current.on("chat_message", addMessage)
                  socketRef.current.on("user-left", (id) => {
                        setVedio((videos) => {
                              videos.filter(video => video.socketId !== id)
                        })
                  })
                  socketRef.current.on("user_joined", (id, client) => {
                        client.forEach(socketId => {
                              connections[socketId] = new RTCPeerConnection(perConfigConnections);
                              connections[socketId].onicecandidate = (event) => {
                                    if (event.candidate != null) {
                                          socketRef.current.emit("signal", socketId, JSON.stringify({ 'ice': event.candidate }));
                                    }
                              }
                              connections[socketId].onaddstream = (event) => {

                                    let ifvdoexists = videoRef.current.find(v => v.socketId === socketId);;

                                    if (ifvdoexists) {
                                          setVedio((videos) => {
                                                const updatedVideos = videos.map(v => {
                                                      v.socketId === socketId ? { ...v, stream: event.stream } : v
                                                })
                                                videoRef.current = updatedVideos;
                                                return updatedVideos;
                                          })
                                    } else {
                                          let newVideo = {
                                                socketId: socketId,
                                                stream: event.stream,
                                                autoPlay: true,
                                                playsinline: true
                                          };
                                          setVedio((videos) => {
                                                const updatedVideos = [...videos, newVideo];
                                                videoRef.current = updatedVideos;
                                                return updatedVideos;
                                          })


                                    }
                              }

                              // ------------------
                              if (window.localStream === undefined && window.localStream === null) {
                                    connections[socketId].addStream(window.localStream);
                              } else {
                                    // todo blacksilence

                              }

                        })
                        // create offer
                        if (id !== socketIdRef.current) {
                              for (let socketId2 in connections) {
                                    if (socketId2 === socketIdRef.current) {
                                          continue;
                                    }
                                    try {
                                          connections[socketId2].addStream(window.localStream);

                                    } catch (err) {

                                    }
                                    connections[socketId2].createOffer().then((discreption) => {
                                          connections[socketId2].setLocalDescription(discreption)
                                                .then(() => {
                                                      socketRef.current.emit("signal", socketId2, JSON.stringify({ 'sdp': connections[socketId2].localDescription }));
                                                })
                                                .catch((err) => {
                                                      console.log("set local description error", err);
                                                })
                                    })

                              }
                        }
                  })

            })
      }


      let getMedia = () => {
            setAudio(audioAvailable);
            setVedio(vedioAvailable);
            connectToSocketServer();
      }

      let connect = () => {
            setAskForUsername(false);
            getMedia();
      }


      return (
            <div className="videomeet-main">
                  {askForUsername === true ? (
                        <div className="videomeet-row clearer-row">
                              <div className="left-section">
                                    <h2 className="lobby-title">Enter into Lobby</h2>
                                    <TextField id="outlined-basic" label="Username" value={username} onChange={e => setUsername(e.target.value)} variant="outlined" fullWidth />
                                    <Button variant="contained" fullWidth onClick={connect}>Connect</Button>
                              </div>
                              <div className="right-section">
                                    <div className="vedio-audio-check-box">
                                          <span className="check-title">Video/Audio Check</span>
                                          <video
                                                ref={localVedioRef}
                                                autoPlay
                                                muted
                                                className="check-video"
                                                src={undefined}
                                          ></video>
                                    </div>
                              </div>
                        </div>
                  ) : (
                        <></>
                  )}
            </div>
      );
}

export default VideoMeet;