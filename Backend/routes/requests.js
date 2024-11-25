const express = require('express');
const router = express.Router();
const { Request } = require('../models/request');
const { User } = require('../models/user'); 
const { Home } = require('../models/home'); 
const  {Message} = require('../models/message');
 const clients = require('./clients');
// POST route to create a new request
router.post('/', async (req, res) => {
    try {
        const sender = req.auth.userId; // Get the sender's userId from req.auth

        const recipient = await User.findById(req.body.recipient);
        if (!recipient) {
            return res.status(400).send({ message: 'Invalid recipient ID.' });
        }
        const recentRejectedRequest = await Request.findOne({
            sender,
            recipient: req.body.recipient,
            status: 'rejected',
            rejectionTimestamp: { $gt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } // within 7 days
        });

        if (recentRejectedRequest) {
            return res.status(400).send({ message: 'You cannot resend a request within 7 days of rejection.' });
        }

        const homeOffered = await Home.findById(req.body.homeOffered); // REVIEW: 
        if (!homeOffered) {
            return res.status(400).send({ message: 'Invalid homeOffered ID.' }); 
        }
        
        if (homeOffered.owner.toString() !== sender) {
            return res.status(400).send({ message: 'You can only send a request for a home you own.' });
        }

        const homeRequested = await Home.findById(req.body.homeRequested);
        if (!homeRequested) {
            return res.status(400).send({ message: 'Invalid homeRequested ID.' });
        }

        const request = new Request({
            sender: sender, // Use sender from req.auth
            recipient: req.body.recipient,
            homeOffered: req.body.homeOffered,
            homeRequested: req.body.homeRequested,
        });

        await request.save();
        const user = await User.findById(`${sender}`)

        const recipientSocket = clients.get(req.body.recipient.toString());
        if (recipientSocket) {
            const notification = {
                type: 'newRequest',
                sender: req.auth.userId,
                message: `You have received a new request from  ${user.name}.`,
                requestId: request._id,
                timestamp: new Date(),
            };
            recipientSocket.send(JSON.stringify(notification));
        }
    
        res.status(201).send(request); 
    } catch (error) {
        // Handle errors
        console.error(error);
        res.status(500).send({ message: `Error creating request: ${error.message}` });
    }
});
 
router.delete('/:id', async (req, res) => {
    try {
        const userId = req.auth.userId;

        const request = await Request.findById(req.params.id);
        if (!request) {
            return res.status(404).send({ message: 'Request does not exist.' });
        }

        if (request.sender.toString() !== userId && request.recipient.toString() !== userId) {
            return res.status(403).send({ message: 'You are not authorized to delete this request.' });
        }

        await request.deleteOne();

        res.status(200).send({ message: 'Request deleted successfully.' });
    } catch (error) {
        console.error(error);
        res.status(500).send({ message: `Error deleting request: ${error.message}` });
    }
});
router.patch('/requests/:id', async (req, res) => {
    try {
        const userId = req.auth.userId;
        const request = await Request.findById(req.params.id);

        if (!request) {
            return res.status(404).send({ message: 'Request not found.' });
        }

        if (request.recipient.toString() !== userId) {
            return res.status(403).send({ message: 'You are not authorized to respond to this request.' });
        }

        const { status } = req.body;
        if (!['accepted', 'rejected'].includes(status)) {
            return res.status(400).send({ message: 'Invalid status. Use "accepted" or "rejected".' });
        }
        if (status === 'rejected') {
            request.rejectionTimestamp = Date.now();
        }
        await request.save();
        if (request.status === 'rejected' && status === 'accepted') {
            return res.status(400).send({
                message: 'You cannot accept a request that has already been rejected.',
            });
        }
        if (request.status === 'accepted' && status === 'rejected') {
            return res.status(400).send({
                message: 'You cannot reject a request that has already been accepted.',
            });
        }
        if (request.status === status) {
            return res.status(400).send({
                message: `Request is already ${status}. No changes were made.`,
            });
        }

        request.status = status;
        await request.save();

        if (status === 'accepted') {
            // Create a system-generated message
            const messageContent = 'You can now communicate to arrange further details.';
            const systemMessage = new Message({
                sender: userId, // System or recipient as the sender
                recipient: request.sender,
                content: messageContent,
            });

            await systemMessage.save();
        
            // WebSocket notification for the sender
            const recipientSocket = clients.get(request.sender.toString());
            if (recipientSocket) {
                const notification = {
                    type: 'newMessage',
                    sender: userId,
                    content: messageContent,
                    timestamp: systemMessage.timestamp,
                };
                recipientSocket.send(JSON.stringify(notification));
            }

            return res.status(200).send({
                message: 'Request accepted successfully. A message has been sent to initiate communication.',
                request,
                systemMessage,
            });
        }
        if (status === 'rejected') {
            // Send WebSocket notification to the sender
            const senderSocket = clients.get(request.sender.toString());
            if (senderSocket) {
                const rejectionNotification = {
                    type: 'requestRejected',
                    recipient: userId,
                    message: 'Your request has been rejected.',
                };
                senderSocket.send(JSON.stringify(rejectionNotification));
            }

            return res.status(200).send({
                message: 'Request rejected successfully. The sender has been notified.',
                request,
            });
        }

        res.status(200).send({ message: `Request ${status} successfully.`, request });
    } catch (error) {
        console.error(error);
        res.status(500).send({ message: `Error updating request status: ${error.message}` });
    }
});
module.exports = router;
