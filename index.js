const express = require("express");
const axios = require("axios");
const cors = require("cors");
const venom = require("venom-bot");
const dotenv = require("dotenv");
const fs = require('fs');
const mime = require('mime-types');
const path = require('path');

dotenv.config();

const app = express();
const port = 5000;

// Increase the request size limit (adjust the limit as needed)
app.use(express.json({ limit: '40mb' }));
app.use(express.urlencoded({ extended: true, limit: '40mb' }));
app.use(cors());

venom
  .create(
    // Session
    "sessionName", // Pass the name of the client you want to start the bot
    // catchQR
    (base64Qrimg, asciiQR, attempts, urlCode) => {
      axios.post(`${process.env.BASE_URL}/chats`, { asciiQR });
    },
    // statusFind
    (statusSession, session) => {
      console.log(statusSession);
    },
    {
      logQR: true,
    },

    // BrowserInstance
    (browser, waPage) => {
      console.log("Browser PID:", browser.process().pid);
      waPage.screenshot({ path: "screenshot.png" });
    }
  )
  .then((client) => {
    function start(client) {
      client.onMessage(async (message) => {
        if (message.isMedia === true || message.isMMS === true) {
            const buffer = await client.decryptFile(message);
            const base64Content = buffer.toString('base64');
            message.content = base64Content; // Update the message content with base64 data

        }
        console.log('info', message);
        // Pass the message to your POST method
        axios.post(`${process.env.BASE_URL}/receive-message`, message)
          .then((res) => console.log(res))
          .catch((error) => console.error(error));
        if (message.body === 'Hello' && message.isGroupMsg === false) {
          client
            .sendText(message.from, 'Welcome there 🕷')
            .then((result) => {
              console.log('Result: ', result); //return object success
            })
            .catch((error) => {
              console.error('Error when sending: ', error); //return object error
            });
        }
      });
    }
    start(client);

    app.post("/send-message", function (req, res) {
      const { to, message, messageType, fileType, fileName, fullPath, extension, messageImg, messageAudio, messageVideo, messageDocument, messageRecording } = req.body;
      
      if (messageType === 'text' && fileType === null) {
        // Send a text message
        client
            .sendText(to, message)
            .then((result) => {
                console.log("Result:", result); // Return object success
                return res.json(result);
            })
            .catch((error) => {
                console.error("Error when sending:", error); // Return object error
                return res.json(error);
            });
      }
      if(fileType !== null) {
        const caption = '';
        // Send the media based on fileType
        switch (fileType) {
          case 'image':
            const base64Data = `data:image/${extension};base64,${messageImg}`;
              client
                  .sendImageFromBase64(to, base64Data, fileName, caption)
                  .then((result) => {
                      console.log('Result: ', result); // Return object success
                      return res.json(result);
                  })
                  .catch((error) => {
                      console.error('Error when sending: ', error); // Return object error
                      return res.json(error);
                  });
              break;
          case 'audio':
              client
                  .sendVoice(to, fullPath)
                  .then((result) => {
                      console.log('Audio Result: ', result); // Return object success
                      return res.json(result);
                  })
                  .catch((error) => {
                      console.error('Error when sending: ', error); // Return object error
                      return res.json(error);
                  });
              break;
          case 'video':
              client
                  .sendVideoAsGif(to, fullPath, fileName, '')
                  .then((result) => {
                      console.log('Result: ', result); // Return object success
                      return res.json(result);
                  })
                  .catch((error) => {
                      console.error('Error when sending: ', error); // Return object error
                      return res.json(error);
                  });
              break;
          case 'document':
              // Send a document file base64
              const fileBase64Data = `data:application/${extension};base64,${messageDocument}`;
              client
                  .sendFileFromBase64(to, fileBase64Data, fileName, caption)
                  .then((result) => {
                      console.log('Result: ', result); // Return object success
                      return res.json(result);
                  })
                  .catch((error) => {
                      console.error('Error when sending: ', error); // Return object error
                      return res.json(error);
                  });
              break;
          case 'recording':
              // Send a recording file
              const recordingFileName = `recording_${Date.now()}.${extension}`; // Generate a unique filename based on time

              const filePath = path.join(__dirname, 'uploads', recordingFileName);

              // Write the buffer to the file
              fs.writeFile(filePath, messageRecording, { encoding: 'base64' }, (error) => {
                if (error) {
                  console.error('Error when saving recording: ', error);
                  return res.status(500).json({ error: 'Error when saving recording' });
                }

                // Send the saved recording file
                client
                  .sendVoice(to, filePath)
                  .then((result) => {
                    console.log('Result: ', result); // Return object success
                    return res.json(result);
                  })
                  .catch((error) => {
                    console.error('Error when sending: ', error); // Return object error
                    return res.json(error);
                  });
              });
              break;
          default:
              // Handle unsupported fileType or do something else as needed
              return res.status(400).json({ message: `${fileName} is Unsupported fileType` });
        }
      }
    });

    // Root URL to display "App Listening"
    app.get("/", function (req, res) {
      res.send("App Listening on Port " + port);
    });

    app.listen(port, function () {
      console.log("App Listening on Port", port);
    });
  })
  .catch((error) => {
    console.log(error);
  });
