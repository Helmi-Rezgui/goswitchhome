        const express = require('express');
        const mongoose = require('mongoose')
        const router = express.Router();
        const { Message } = require('../models/message');
        const { User } = require('../models/user');
        // const { clients } = require('../../app');
        const clients = require('./clients');
        //TODO: socket integration
        // Send a new message
        router.post('/message', async (req, res) => {
            const recipient = await User.findById(req.body.recipient);
            if (!recipient) {
                return res.status(404).json({ error: 'User not found' });
            }
        
            const sender = req.auth.userId;
            const content = req.body.content;
        
            try {
                // Check if there's an accepted request between sender and recipient
                const acceptedRequest = await Request.findOne({
                    sender,
                    recipient: req.body.recipient,
                    status: 'accepted',
                });
        
                if (!acceptedRequest) {
                    return res.status(403).send({ message: 'Messaging is not allowed until the request is accepted.' });
                }
        
                const message = new Message({ sender, recipient: req.body.recipient, content });
                await message.save();
        
                // WebSocket notification for the recipient
                const recipientSocket = clients.get(req.body.recipient);
                if (recipientSocket) {
                    const notification = {
                        type: 'newMessage',
                        sender,
                        content,
                        timestamp: message.timestamp,
                    };
        
                    recipientSocket.send(JSON.stringify(notification));
                }
        
                res.status(201).send(message);
            } catch (error) {
                res.status(400).send('Message could not be sent: ' + error.message);
            }
        });

        // Get all messages between two users
        router.get('/messages/:user1/:user2', async (req, res) => {
            const { user1, user2 } = req.params;
            try {
                const messages = await Message.find({
                    $or: [
                        { sender: user1, recipient: user2 },
                        { sender: user2, recipient: user1 }
                    ]
                }).sort({ timestamp: 1 }); // Sort by timestamp in ascending order for conversation flow

                res.send(messages);
            } catch (error) {
                res.status(400).send("Could not retrieve messages: " + error.message);
            }
        });

        // Mark messages as read
        router.patch('/messages/read', async (req, res) => {
            const { user1, user2 } = req.body; // These would be the user IDs involved in the conversation

            // Ensure user1 and user2 are not the same user
            if (user1 === user2) {
                return res.status(400).send("Cannot mark your own messages as read");
            }

            try {
                // Find all messages between user1 and user2
                const messages = await Message.updateMany(
                    {
                        $or: [
                            { sender: user1, recipient: user2 },
                            { sender: user2, recipient: user1 }
                        ],
                        read: false // Only update unread messages
                    },
                    { $set: { read: true } } // Set read to true for all matching messages
                );

                // if (messages.modifiedCount === 0) {
                //     return res.status(404).send("No unread messages found");
                // }

                res.send({ message: "Messages marked as read", count: messages.modifiedCount });
            } catch (error) {
                res.status(500).send("Could not update messages: " + error.message);
            }
        });


        module.exports = router;
