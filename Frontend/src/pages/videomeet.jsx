import React, { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import "./videomeet.css";
import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import VideocamIcon from '@mui/icons-material/Videocam';
import VideocamOffIcon from '@mui/icons-material/VideocamOff'
import CallEnd from '@mui/icons-material/CallEnd';
import AudioIcon from '@mui/icons-material/Mic'
import AudioOffIcon from '@mui/icons-material/MicOff'
import ScreenShareIcon from '@mui/icons-material/ScreenShare';
import StopScreenShareIcon from '@mui/icons-material/StopScreenShare'
import Badge from '@mui/material/Badge';
import ChatIcon from '@mui/icons-material/Chat';
import GroupsIcon from '@mui/icons-material/Groups';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import VolumeOffIcon from '@mui/icons-material/VolumeOff';
import server from '../environment';



const serverUrl =  server;

const peerConfigConnections = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' }
  ]
};

const RemoteVideoTile = React.memo(function RemoteVideoTile({
  socketId,
  stream,
  displayName,
  isRemoteAudioMuted = false,
  onClick,
  isPinned = false,
  variant = "grid",
}) {
  const remoteVideoRef = useRef(null);

  useEffect(() => {
    if (!remoteVideoRef.current || !stream) return;
    if (remoteVideoRef.current.srcObject !== stream) {
      remoteVideoRef.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <div
      className={`remote-video-wrapper remote-video-${variant} ${isPinned ? "is-pinned" : ""} ${onClick ? "is-clickable" : ""}`}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => e.key === "Enter" && onClick() : undefined}
    >
      <video
        data-socket={socketId}
        ref={remoteVideoRef}
        autoPlay
        playsInline
        muted={isRemoteAudioMuted}
        className="remote-video-el"
      />
      <p className="remote-username-label">
        {displayName || `User ${socketId.substring(0, 6)}`}
      </p>
      {isPinned ? (
        <span className="remote-pin-badge">Pinned</span>
      ) : null}
    </div>
  );
});

function VideoMeet() {
  const navigate = useNavigate();
  const location = useLocation();

  // Refs
  const socketRef = useRef(null);
  const socketIdRef = useRef(null);
  const localVideoRef = useRef(null);
  const localOverlayRef = useRef(null);
  const connectionsRef = useRef({});
  const makingOfferRef = useRef({});
  const pendingNegotiationRef = useRef({});
  const showModalRef = useRef(false);
  const audioContextRef = useRef(null);
  const analyserNodeRef = useRef(null);
  const audioSourceNodeRef = useRef(null);
  const audioMeterRafRef = useRef(null);
  const localOverlayDragRef = useRef({
    isDragging: false,
    pointerId: null,
    pointerOffsetX: 0,
    pointerOffsetY: 0,
  });

  // State
  const [videoAvailable, setVideoAvailable] = useState(false);
  const [audioAvailable, setAudioAvailable] = useState(false);
  const [video, setVideo] = useState(false);
  const [audio, setAudio] = useState(false);
  const [isRemoteAudioMuted, setIsRemoteAudioMuted] = useState(false);
  const [screen, setScreen] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showParticipants, setShowParticipants] = useState(false);
  const [screenAvailable, setScreenAvailable] = useState(false);
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState("");
  const [newMessage, setNewMessage] = useState(0);
  const [askForUsername, setAskForUsername] = useState(true);
  const [username, setUsername] = useState("");
  const [videos, setVideos] = useState([]);
  const [participantNames, setParticipantNames] = useState({});
  const [participantOrder, setParticipantOrder] = useState([]);
  const [pinnedSocketId, setPinnedSocketId] = useState(null);
  const [localOverlayPosition, setLocalOverlayPosition] = useState(null);
  const [isDraggingLocalOverlay, setIsDraggingLocalOverlay] = useState(false);
  const [permissionsLoaded, setPermissionsLoaded] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);

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

      // Initialize lobby controls to actual device availability.
      setVideo(hasVideo);
      setAudio(hasAudio);
    } catch (err) {
      console.error("Error getting permissions:", err);
    } finally {
      setPermissionsLoaded(true);
    }
  };

  useEffect(() => {
    getPermissions();
  }, []);

  useEffect(() => {
    showModalRef.current = showModal;
    if (showModal) {
      setNewMessage(0);
    }
  }, [showModal]);

  const clampValue = (value, min, max) => Math.min(Math.max(value, min), max);

  const clampLocalOverlayPosition = (position) => {
    if (!position) return position;

    const overlayElement = localOverlayRef.current;
    const parentElement = overlayElement?.parentElement;
    if (!overlayElement || !parentElement) return position;

    const parentRect = parentElement.getBoundingClientRect();
    const overlayRect = overlayElement.getBoundingClientRect();
    const maxX = Math.max(0, parentRect.width - overlayRect.width);
    const maxY = Math.max(0, parentRect.height - overlayRect.height);

    return {
      x: clampValue(position.x, 0, maxX),
      y: clampValue(position.y, 0, maxY),
    };
  };

  const handleLocalOverlayPointerDown = (event) => {
    if (event.button !== 0) return;

    const overlayElement = localOverlayRef.current;
    const parentElement = overlayElement?.parentElement;
    if (!overlayElement || !parentElement) return;

    event.preventDefault();

    const parentRect = parentElement.getBoundingClientRect();
    const overlayRect = overlayElement.getBoundingClientRect();
    const calculatedPosition = localOverlayPosition || {
      x: overlayRect.left - parentRect.left,
      y: overlayRect.top - parentRect.top,
    };
    const normalizedPosition = clampLocalOverlayPosition(calculatedPosition);

    if (!localOverlayPosition) {
      setLocalOverlayPosition(normalizedPosition);
    }

    localOverlayDragRef.current = {
      isDragging: true,
      pointerId: event.pointerId,
      pointerOffsetX: event.clientX - (parentRect.left + normalizedPosition.x),
      pointerOffsetY: event.clientY - (parentRect.top + normalizedPosition.y),
    };
    setIsDraggingLocalOverlay(true);
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handleLocalOverlayPointerMove = (event) => {
    const dragState = localOverlayDragRef.current;
    if (!dragState.isDragging || dragState.pointerId !== event.pointerId) return;

    const overlayElement = localOverlayRef.current;
    const parentElement = overlayElement?.parentElement;
    if (!overlayElement || !parentElement) return;

    event.preventDefault();

    const parentRect = parentElement.getBoundingClientRect();
    const overlayRect = overlayElement.getBoundingClientRect();
    const maxX = Math.max(0, parentRect.width - overlayRect.width);
    const maxY = Math.max(0, parentRect.height - overlayRect.height);

    const nextX = clampValue(
      event.clientX - parentRect.left - dragState.pointerOffsetX,
      0,
      maxX
    );
    const nextY = clampValue(
      event.clientY - parentRect.top - dragState.pointerOffsetY,
      0,
      maxY
    );

    setLocalOverlayPosition({ x: nextX, y: nextY });
  };

  const endLocalOverlayDrag = (event) => {
    const dragState = localOverlayDragRef.current;
    if (dragState.pointerId !== event.pointerId) return;

    localOverlayDragRef.current = {
      isDragging: false,
      pointerId: null,
      pointerOffsetX: 0,
      pointerOffsetY: 0,
    };
    setIsDraggingLocalOverlay(false);

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  useEffect(() => {
    const handleResize = () => {
      setLocalOverlayPosition((previousPosition) =>
        clampLocalOverlayPosition(previousPosition)
      );
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
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

  const stopAudioLevelMeter = () => {
    if (audioMeterRafRef.current) {
      cancelAnimationFrame(audioMeterRafRef.current);
      audioMeterRafRef.current = null;
    }

    if (audioSourceNodeRef.current) {
      try {
        audioSourceNodeRef.current.disconnect();
      } catch (err) {
        console.warn("Error disconnecting audio source node:", err);
      }
      audioSourceNodeRef.current = null;
    }

    if (analyserNodeRef.current) {
      try {
        analyserNodeRef.current.disconnect();
      } catch (err) {
        console.warn("Error disconnecting analyser node:", err);
      }
      analyserNodeRef.current = null;
    }

    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => { });
      audioContextRef.current = null;
    }

    setAudioLevel(0);
  };

  const startAudioLevelMeter = (stream) => {
    stopAudioLevelMeter();

    // Mic level is only shown in lobby; skip updates during the call to avoid extra re-renders.
    if (!askForUsername || !audio || !stream) return;

    const liveAudioTrack = stream.getAudioTracks().find(track =>
      track.readyState === "live" && track.enabled
    );
    if (!liveAudioTrack) return;

    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;

    try {
      const context = new AudioContextClass();
      const analyser = context.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.8;

      const source = context.createMediaStreamSource(stream);
      source.connect(analyser);

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      const updateMeter = () => {
        analyser.getByteFrequencyData(dataArray);

        let sum = 0;
        for (let i = 0; i < dataArray.length; i += 1) {
          sum += dataArray[i];
        }

        const avg = sum / dataArray.length;
        const level = Math.min(100, Math.round((avg / 255) * 150));
        setAudioLevel(prev => Math.round((prev * 0.7) + (level * 0.3)));
        audioMeterRafRef.current = requestAnimationFrame(updateMeter);
      };

      if (context.state === "suspended") {
        context.resume().catch(() => { });
      }

      audioContextRef.current = context;
      analyserNodeRef.current = analyser;
      audioSourceNodeRef.current = source;
      updateMeter();
    } catch (err) {
      console.error("Error starting audio level meter:", err);
      setAudioLevel(0);
    }
  };

  const getSenderByKind = (peerConnection, kind) => {
    const byTransceiver = peerConnection
      .getTransceivers()
      .find(transceiver => transceiver?.receiver?.track?.kind === kind);

    if (byTransceiver?.sender) return byTransceiver.sender;

    return peerConnection
      .getSenders()
      .find(sender => sender?.track?.kind === kind);
  };

  const renegotiatePeer = async (peerConnection, id) => {
    if (!socketRef.current || !peerConnection) return;
    if (makingOfferRef.current[id] || peerConnection.signalingState !== "stable") {
      pendingNegotiationRef.current[id] = true;
      return;
    }

    makingOfferRef.current[id] = true;
    try {
      const offer = await peerConnection.createOffer();
      if (peerConnection.signalingState !== "stable") {
        pendingNegotiationRef.current[id] = true;
        return;
      }
      await peerConnection.setLocalDescription(offer);
      socketRef.current.emit("signal", id, JSON.stringify({
        sdp: peerConnection.localDescription
      }));
    } catch (err) {
      console.error("Error syncing stream:", err);
    } finally {
      makingOfferRef.current[id] = false;
      if (pendingNegotiationRef.current[id] && peerConnection.signalingState === "stable") {
        pendingNegotiationRef.current[id] = false;
        renegotiatePeer(peerConnection, id);
      }
    }
  };

  const syncStreamToPeers = async (stream) => {
    const nextAudioTrack = stream.getAudioTracks()[0] || null;
    const nextVideoTrack = stream.getVideoTracks()[0] || null;

    for (const id in connectionsRef.current) {
      if (id === socketIdRef.current) continue;
      const peerConnection = connectionsRef.current[id];
      if (!peerConnection) continue;

      try {
        const audioSender = getSenderByKind(peerConnection, "audio");
        const videoSender = getSenderByKind(peerConnection, "video");

        if (audioSender) {
          await audioSender.replaceTrack(nextAudioTrack);
        } else if (nextAudioTrack) {
          peerConnection.addTrack(nextAudioTrack, stream);
        }

        if (videoSender) {
          await videoSender.replaceTrack(nextVideoTrack);
        } else if (nextVideoTrack) {
          peerConnection.addTrack(nextVideoTrack, stream);
        }

        await renegotiatePeer(peerConnection, id);
      } catch (err) {
        console.error("Error updating peer connection:", err);
      }
    }
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
    startAudioLevelMeter(stream);
    syncStreamToPeers(stream);

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
        stopAudioLevelMeter();
        syncStreamToPeers(blackSilenceStream);
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
        stopAudioLevelMeter();
      }
    } catch (err) {
      console.error("Error in getUserMedia:", err);
    }
  };

  // Update media when video/audio state changes
  useEffect(() => {
    if (!permissionsLoaded) return;
    if (screen) return;
    if (video !== undefined && audio !== undefined) {
      getUserMedia();
    }
  }, [video, audio, askForUsername, permissionsLoaded, screen]);

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
    setMessages(prevMessages => [
      ...prevMessages,
      { sender, data, socketIdSender }
    ]);

    const isOwnMessage = socketIdSender === socketIdRef.current;
    if (!isOwnMessage && !showModalRef.current) {
      setNewMessage(prev => prev + 1);
    }
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
      socketRef.current.emit('join_call', location.pathname, username);
      socketIdRef.current = socketRef.current.id;

      // Handle chat messages
      socketRef.current.on("chat_message", addMessage);

      // Handle user left
      const handleUserLeft = (id) => {
        console.log("User left:", id);
        setVideos(prevVideos =>
          prevVideos.filter(video => video.socketId !== id)
        );
        setParticipantNames(prevNames => {
          const updatedNames = { ...prevNames };
          delete updatedNames[id];
          return updatedNames;
        });
        setParticipantOrder(prevOrder => prevOrder.filter(socketId => socketId !== id));
        setPinnedSocketId(prevPinned => (prevPinned === id ? null : prevPinned));

        if (connectionsRef.current[id]) {
          connectionsRef.current[id].close();
          delete connectionsRef.current[id];
        }
        delete makingOfferRef.current[id];
        delete pendingNegotiationRef.current[id];
      };
      socketRef.current.on("user-left", handleUserLeft);
      socketRef.current.on("user_disconnected", handleUserLeft);

      // Handle user joined
      socketRef.current.on("user_joined", (id, clients, participants) => {
        console.log("User joined:", id, "Clients:", clients);
        if (Array.isArray(clients)) {
          setParticipantOrder(Array.from(new Set(clients.filter(Boolean))));
        }
        if (participants && typeof participants === "object") {
          setParticipantNames(prevNames => ({
            ...prevNames,
            ...participants,
          }));
        }

        clients.forEach(socketId => {
          if (socketId === socketIdRef.current) return;
          if (connectionsRef.current[socketId]) return;
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

          connectionsRef.current[socketId].onsignalingstatechange = () => {
            const peerConnection = connectionsRef.current[socketId];
            if (!peerConnection) return;
            if (
              peerConnection.signalingState === "stable" &&
              pendingNegotiationRef.current[socketId]
            ) {
              pendingNegotiationRef.current[socketId] = false;
              renegotiatePeer(peerConnection, socketId);
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
                  return updatedVideos;
                } else {
                  const newVideo = {
                    socketId,
                    stream,
                    autoPlay: true,
                    playsInline: true
                  };
                  const updatedVideos = [...prevVideos, newVideo];
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
            const localAudioTrack = window.localStream.getAudioTracks()[0];
            const localVideoTrack = window.localStream.getVideoTracks()[0];
            if (localAudioTrack) {
              connectionsRef.current[socketId].addTrack(localAudioTrack, window.localStream);
            }
            if (localVideoTrack) {
              connectionsRef.current[socketId].addTrack(localVideoTrack, window.localStream);
            }
          } else {
            const blackSilenceStream = createBlackSilenceStream();
            window.localStream = blackSilenceStream;
            const localAudioTrack = blackSilenceStream.getAudioTracks()[0];
            const localVideoTrack = blackSilenceStream.getVideoTracks()[0];
            if (localAudioTrack) {
              connectionsRef.current[socketId].addTrack(localAudioTrack, blackSilenceStream);
            }
            if (localVideoTrack) {
              connectionsRef.current[socketId].addTrack(localVideoTrack, blackSilenceStream);
            }
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

  let handleVideo = () => {
    if (!videoAvailable) return;
    setVideo(prev => !prev);
  };

  let handleAudio = () => {
    if (!audioAvailable) return;
    setAudio(prev => !prev);
  };

  let handleRemoteAudioMute = () => {
    setIsRemoteAudioMuted(prev => !prev);
  };

  const getDisplayMediaSuccess = (displayStream) => {
    try {
      if (window.localStream) {
        window.localStream.getTracks().forEach(track => track.stop());
      }
    } catch (err) {
      console.log(err);
    }

    window.localStream = displayStream;
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = displayStream;
    }
    stopAudioLevelMeter();
    syncStreamToPeers(displayStream);

    const [screenTrack] = displayStream.getVideoTracks();
    if (screenTrack) {
      screenTrack.onended = () => {
        setScreen(false);
      };
    }
  };

  const getDisplayMedia = async () => {
    if (!screenAvailable || !navigator.mediaDevices.getDisplayMedia) return;

    if (!screen) {
      getUserMedia();
      return;
    }

    try {
      const displayStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: audio && audioAvailable
      });
      getDisplayMediaSuccess(displayStream);
    } catch (e) {
      console.log("Error getting display media:", e);
      setScreen(false);
    }
  };

  useEffect(() => {
    if (askForUsername) return;
    getDisplayMedia();
  }, [screen, askForUsername, screenAvailable]);

  let handleScreen = () => {
    if (!screenAvailable) return;
    setScreen(prev => !prev);
  };

  let handleChat = () => {
    setShowModal(prev => !prev);
  };

  let handleParticipants = () => {
    setShowParticipants(prev => !prev);
  };

  let sendMsg = () => {
    const text = message.trim();
    if (!text || !socketRef.current) return;
    socketRef.current.emit("chat_message", text, username);
    setMessage("");
  };

  let handleEndCall = () => {
    navigate("/home");
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopAudioLevelMeter();

      // Close all connections
      for (let id in connectionsRef.current) {
        connectionsRef.current[id].close();
      }
      connectionsRef.current = {};
      makingOfferRef.current = {};
      pendingNegotiationRef.current = {};

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

  const normalizedAudioLevel = audio && audioAvailable ? audioLevel : 0;
  const audioLevelStateClass = normalizedAudioLevel > 70
    ? 'hot'
    : normalizedAudioLevel > 35
      ? 'warm'
      : 'cool';


  useEffect(() => {
    const chat = document.querySelector(".chatDisplay");
    if (chat) chat.scrollTop = chat.scrollHeight;
  }, [messages]);

  useEffect(() => {
    if (pinnedSocketId && !videos.some(video => video.socketId === pinnedSocketId)) {
      setPinnedSocketId(null);
    }
  }, [videos, pinnedSocketId]);

  const handleTogglePin = (socketId) => {
    if (!socketId) return;
    setPinnedSocketId(prevPinned => (prevPinned === socketId ? null : socketId));
  };

  const pinnedVideo = videos.find(video => video.socketId === pinnedSocketId) || null;
  const hasPinnedLayout = Boolean(pinnedVideo && videos.length > 1);
  const sideVideos = hasPinnedLayout
    ? videos.filter(video => video.socketId !== pinnedVideo.socketId)
    : [];
  const gridVideos = hasPinnedLayout ? [] : videos;

  const remoteCount = gridVideos.length;
  let remoteGridClassName = "remote-videos-grid";
  if (remoteCount <= 1) {
    remoteGridClassName += " remote-count-1";
  } else if (remoteCount === 2) {
    remoteGridClassName += " remote-count-2";
  } else if (remoteCount <= 4) {
    remoteGridClassName += " remote-count-4";
  } else {
    remoteGridClassName += " remote-count-many";
  }

  const localOverlayStyle = localOverlayPosition
    ? {
      left: `${localOverlayPosition.x}px`,
      top: `${localOverlayPosition.y}px`,
      right: "auto",
      bottom: "auto",
    }
    : undefined;

  const localSocketId = socketIdRef.current;
  const fallbackOrderedIds = Object.keys(participantNames);
  const orderedParticipantIds = Array.from(
    new Set(
      (participantOrder.length > 0 ? participantOrder : fallbackOrderedIds).filter(Boolean)
    )
  );
  const participantIdsWithLocal = localSocketId && !orderedParticipantIds.includes(localSocketId)
    ? [localSocketId, ...orderedParticipantIds]
    : orderedParticipantIds;
  const hostSocketId = participantIdsWithLocal[0] || null;

  const participantsForPanel = participantIdsWithLocal.map((socketId) => {
    const isLocal = socketId === localSocketId;
    const displayName = isLocal
      ? (username?.trim() || participantNames[socketId] || `User ${socketId.substring(0, 6)}`)
      : (participantNames[socketId] || `User ${socketId.substring(0, 6)}`);

    return {
      socketId,
      displayName,
      isLocal,
      isHost: socketId === hostSocketId,
    };
  }).sort((firstUser, secondUser) => {
    if (firstUser.isLocal && !secondUser.isLocal) return -1;
    if (!firstUser.isLocal && secondUser.isLocal) return 1;
    return 0;
  });













  return (
    <div className="videomeet-main">
      {askForUsername ? (
        <div className="videomeet-row clearer-row">
          <div className="left-section">
            <h2 className="lobby-title">Lobby Area</h2>
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
              <span className="audio-level-label">Mic Level</span>
              <video
                ref={localVideoRef}
                autoPlay
                muted
                playsInline
                className="check-video"
              />

              {/* audio auto up and down bar based on sound*/}
              <div className="audio-level-wrap">
                <div className="audio-level-row">
                  <span className="audio-level-label">Mic Level</span>
                  <span className="audio-level-percent">{normalizedAudioLevel}%</span>
                </div>
                <div
                  className="audio-level-meter"
                  role="img"
                  aria-label={`Microphone level ${normalizedAudioLevel}%`}
                >
                  <span
                    className={`audio-level-fill ${audioLevelStateClass}`}
                    style={{ width: `${normalizedAudioLevel}%` }}
                  />
                </div>
              </div>

              <hr className='lobby-mic-vdo-controls-distributer' />

              <div className='check-video-audio-controls'>
                <IconButton onClick={() => handleAudio()} disabled={!audioAvailable}>
                  {audio ? <AudioIcon className='lobbymiccontrols' /> : <AudioOffIcon className='lobbymiccontrols' />}
                </IconButton>

                <IconButton onClick={() => handleVideo()} disabled={!videoAvailable}>
                  {video ? <VideocamIcon className='lobbyvdocamcontrols' /> : <VideocamOffIcon className='lobbyvdocamcontrols' />}
                </IconButton>
              </div>


            </div>
          </div>
        </div>
      ) : (
        <div className="video-meet-main-container">
          {/* Remote videos grid */}


          <div className={`remote-stage-host ${hasPinnedLayout ? "has-pinned-layout" : ""}`}>
            {videos.length === 0 && (
              <div className="remote-empty-state">
                No remote participants connected yet.
              </div>
            )}

            {videos.length > 0 && hasPinnedLayout && pinnedVideo ? (
              <div className="pinned-layout">
                <div className="pinned-sidebar">
                  <div className="pinned-sidebar-title">Participants</div>
                  {sideVideos.map((vdo) => (
                    <RemoteVideoTile
                      key={vdo.socketId}
                      socketId={vdo.socketId}
                      stream={vdo.stream}
                      displayName={participantNames[vdo.socketId]}
                      isRemoteAudioMuted={isRemoteAudioMuted}
                      variant="sidebar"
                      onClick={() => handleTogglePin(vdo.socketId)}
                    />
                  ))}
                </div>

                <div className="pinned-stage">
                  <RemoteVideoTile
                    key={pinnedVideo.socketId}
                    socketId={pinnedVideo.socketId}
                    stream={pinnedVideo.stream}
                    displayName={participantNames[pinnedVideo.socketId]}
                    isRemoteAudioMuted={isRemoteAudioMuted}
                    variant="stage"
                    isPinned
                    onClick={() => handleTogglePin(pinnedVideo.socketId)}
                  />
                </div>
              </div>
            ) : null}

            {videos.length > 0 && !hasPinnedLayout ? (
              <div className={remoteGridClassName}>
                {gridVideos.map((vdo) => (
                  <RemoteVideoTile
                    key={vdo.socketId}
                    socketId={vdo.socketId}
                    stream={vdo.stream}
                    displayName={participantNames[vdo.socketId]}
                    isRemoteAudioMuted={isRemoteAudioMuted}
                    onClick={videos.length > 1 ? () => handleTogglePin(vdo.socketId) : undefined}
                  />
                ))}
              </div>
            ) : null}

            {/* Local video overlay */}
            <div
              ref={localOverlayRef}
              className={`local-video-overlay ${hasPinnedLayout ? "pinned-mode" : ""} ${isDraggingLocalOverlay ? "is-dragging" : ""}`}
              onPointerDown={handleLocalOverlayPointerDown}
              onPointerMove={handleLocalOverlayPointerMove}
              onPointerUp={endLocalOverlayDrag}
              onPointerCancel={endLocalOverlayDrag}
              style={localOverlayStyle}
              title="Drag to move"
            >
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

          {/* participants room */}
          {showParticipants && (
            <div className={`participantsRoom ${showModal ? "with-chat" : ""}`}>
              <div className="participantsContainer">
                <div className="participantsHeader">
                  Participants ({participantsForPanel.length})
                </div>

                <div className="participantsList">
                  {participantsForPanel.length > 0 ? (
                    participantsForPanel.map((participant) => (
                      <div key={participant.socketId} className={`participantItem ${participant.isLocal ? "isLocal" : ""}`}>
                        <div className="participantName">
                          {participant.displayName}
                          {participant.isLocal ? " (You)" : ""}
                        </div>
                        {participant.isHost ? (
                          <span className="participantHostTag">Host</span>
                        ) : null}
                      </div>
                    ))
                  ) : (
                    <p className="participantsEmptyState">No participants yet</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* chat room  */}

          {showModal && (
            <div className="chatRoom">
              <div className="chatContainer">

                <div className="chatHeader">Chat</div>

                <div className="chatDisplay">
                  {messages.length > 0 ? (
                    messages.map((msg, index) => (
                      <div
                        key={index}
                        className={`aMsgbox ${msg.sender === username ? "myMsg" : "otherMsg"
                          }`}
                      >
                        {/* <div className="sender">{msg.sender}</div> */}


                        {
                          msg.sender === username ? 
                          <div className="sender">You</div> 
                          :
                           <div className="sender">{msg.sender}</div>
                        }

                        <div>{msg.data}</div>
                      </div>
                    ))
                  ) : (
                    <p style={{ opacity: 0.5 }}>No Messages Yet</p>
                  )}
                </div>

                <div className="chatarea">
                  <TextField
                    variant="outlined"
                    size="small"
                    placeholder="Type a message"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className="chatTextField"
                  />

                  <Button
                    variant="contained"
                    className="chatTextSend"
                    onClick={sendMsg}
                  >
                    <span className="material-symbols-outlined">send</span>
                  </Button>
                </div>

              </div>
            </div>
          )}



          {/* buttons */}
          <div className="controls-container-main">
            <div className="controls-container">
              <IconButton onClick={() => handleVideo()} disabled={!videoAvailable}>
                {video ? <VideocamIcon className='vdocamcontrols' /> : <VideocamOffIcon className='vdocamcontrols' />}
              </IconButton>

              <IconButton onClick={() => handleAudio()} disabled={!audioAvailable}>
                {audio ? <AudioIcon className='miccontrols' /> : <AudioOffIcon className='miccontrols' />}
              </IconButton>

              <IconButton onClick={handleRemoteAudioMute}>
                {isRemoteAudioMuted ? <VolumeOffIcon className='speakercontrol' /> : <VolumeUpIcon className='speakercontrol' />}
              </IconButton>

            

              <IconButton onClick={handleEndCall} >
                <CallEnd className='callendcontrol' />
              </IconButton>

                {
                screenAvailable === true ?
                  <IconButton onClick={handleScreen} >
                    {screen === true ? <StopScreenShareIcon className='Screensharecontrols' /> : <ScreenShareIcon className='Screensharecontrols' />}
                  </IconButton> : <></>
              }

              <Badge badgeContent={Math.max(participantsForPanel.length - 1, 0)} color="primary">
                <IconButton onClick={handleParticipants} >
                  <GroupsIcon className='participantscontrol' />
                </IconButton>
              </Badge>

              <Badge badgeContent={newMessage} color="error">
                <IconButton onClick={handleChat} >
                  <ChatIcon className='chatcontrol' />
                </IconButton>
              </Badge>

            </div>
          </div>





        </div>
      )}
    </div>
  );






  
}

export default VideoMeet;

