const { connection } = require('mongoose');
const socketIO = require('socket.io');


let connections = {};
let messages = {};
let timeOnline = {};
let roomParticipants = {};

const connectToSocket = (server) => {
  const io = socketIO(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
      allowedHeaders: ["*"],
      credentials: true,
    },
  });

  io.on('connection', (socket) => {
    console.log('New client connected:', socket.id);

    

    socket.on('join_call', (path, username) => {
      if (connections[path] === undefined) {
        connections[path] = [];
      }
      if (roomParticipants[path] === undefined) {
        roomParticipants[path] = {};
      }

      connections[path].push(socket.id);
      const participantName = typeof username === 'string' && username.trim()
        ? username.trim()
        : `User ${socket.id.substring(0, 6)}`;
      roomParticipants[path][socket.id] = participantName;
      timeOnline[socket.id] = new Date();

      for (let a = 0; a < connections[path].length; a++) {
        io.to(connections[path][a]).emit('user_joined', socket.id, connections[path], roomParticipants[path]);
      }

      if (messages[path] === undefined) {
        messages[path] = [];
      }
      for (let a = 0; a < messages[path].length; a++) {
        io.to(socket.id).emit('chat_message', messages[path][a]['data'],
          messages[path][a]['sender'], messages[path][a]['socket-id-sender']);
      }

    });

    socket.on('signal', (toId, messages) => {
      io.to(toId).emit('signal', socket.id, messages);
    });

    socket.on('chat_message', (data, sender) => {

      const [matchingRoom, found] = Object.entries(connections).reduce(([room, isFound], [roomKey, roomValue]) => {
        if (!isFound && roomValue.includes(socket.id)) {
          return [roomKey, true];
        }
        return [room, isFound];

      }, ['', false]);

      if (found == true) {
        if (messages[matchingRoom] === undefined) {
          messages[matchingRoom] = [];
        }
        messages[matchingRoom].push({'data': data, 'sender': sender, 'socket-id-sender': socket.id});
        console.log("Message stored in room: ", matchingRoom , ": ", data, " from ", sender);

        connections[matchingRoom].forEach(socketId => {
          io.to(socketId).emit('chat_message', data, sender, socket.id);
        });
      }

    });

    socket.on('disconnect', () => {

      var difftime = Math.abs(timeOnline[socket.id] - new Date());

      var key;
      for(const [key, value] of JSON.parse(JSON.stringify(Object.entries(connections)))) {
          for( let i = 0; i < value.length; ++i) {
            if (value[i] === socket.id) {
              for (let a = 0; a < connections[key].length; ++a) {
                io.to(connections [key][a]).emit('user_disconnected', socket.id);
              }
              var index = connections[key].indexOf(socket.id);

              connections[key].splice(index, 1);
              if (roomParticipants[key] !== undefined) {
                delete roomParticipants[key][socket.id];
              }

              if(connections[key].length == 0) {  
                delete connections[key];
                delete roomParticipants[key];
              }

            }
      }
    }

      console.log()
      console.log('Client disconnected:', socket.id);
    });

    return io;
  });
};

module.exports = connectToSocket;
