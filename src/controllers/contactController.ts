import { Request, Response, RequestHandler } from 'express';
import { AuthRequest } from '../middleware/authMiddleware';
import Contact from '../models/Contact';
import Dispute from '../models/Dispute';

// POST /api/contacts - Create a new contact submission
export const createContact: RequestHandler = async (req: Request, res: Response) => {
  try {
    const { name, email, subject, message, category = 'general' } = req.body;

    if (!name || !email || !subject || !message) {
      return res.status(400).json({ 
        message: 'Name, email, subject, and message are required' 
      });
    }

    // Determine if this should be treated as a dispute based on category or keywords
    const disputeKeywords = ['dispute', 'problem', 'issue', 'complaint', 'refund', 'lost', 'stolen', 'fraud'];
    const isDispute = category === 'security' || category === 'trading' || 
                     disputeKeywords.some(keyword => 
                       subject.toLowerCase().includes(keyword) || 
                       message.toLowerCase().includes(keyword)
                     );

    // Set priority based on category and dispute status
    let priority: 'low' | 'medium' | 'high' = 'medium';
    if (isDispute || category === 'security') {
      priority = 'high';
    } else if (category === 'technical' || category === 'billing') {
      priority = 'medium';
    } else {
      priority = 'low';
    }

    const contact = await Contact.create({
      name,
      email,
      subject,
      message,
      category,
      priority,
      isDispute,
      status: 'open'
    });

    return res.status(201).json({
      message: 'Contact submission received successfully',
      contact: {
        id: contact._id,
        isDispute: contact.isDispute,
        priority: contact.priority,
        status: contact.status
      }
    });
  } catch (error: any) {
    console.error('Error creating contact:', error);
    return res.status(500).json({ 
      message: 'Failed to submit contact form', 
      error: error.message 
    });
  }
};

// GET /api/contacts - Get all contact submissions (admin only)
export const getAllContacts: RequestHandler = async (req: Request, res: Response) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      status, 
      category, 
      priority,
      disputesOnly 
    } = req.query;

    const filter: any = {};
    if (status) filter.status = status;
    if (category) filter.category = category;
    if (priority) filter.priority = priority;
    if (disputesOnly === 'true') filter.isDispute = true;

    const contacts = await Contact.find(filter)
      .populate('assignedTo', 'name email')
      .populate('disputeId')
      .sort({ createdAt: -1 })
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit));

    const total = await Contact.countDocuments(filter);

    return res.json({
      contacts,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit))
      }
    });
  } catch (error: any) {
    console.error('Error fetching contacts:', error);
    return res.status(500).json({ 
      message: 'Failed to fetch contacts', 
      error: error.message 
    });
  }
};

// PUT /api/contacts/:id/status - Update contact status
export const updateContactStatus: RequestHandler = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status, assignedTo, response } = req.body;
    const authReq = req as AuthRequest;

    const validStatuses = ['open', 'in_progress', 'resolved', 'closed'];
    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    const updateData: any = {};
    if (status) updateData.status = status;
    if (assignedTo) updateData.assignedTo = assignedTo;

    // Add response if provided
    if (response && authReq.user) {
      updateData.$push = {
        responses: {
          message: response,
          respondedBy: authReq.user._id,
          respondedAt: new Date()
        }
      };
    }

    const contact = await Contact.findByIdAndUpdate(id, updateData, { new: true })
      .populate('assignedTo', 'name email')
      .populate('responses.respondedBy', 'name email');

    if (!contact) {
      return res.status(404).json({ message: 'Contact not found' });
    }

    return res.json(contact);
  } catch (error: any) {
    console.error('Error updating contact:', error);
    return res.status(500).json({ 
      message: 'Failed to update contact', 
      error: error.message 
    });
  }
};

// POST /api/contacts/:id/escalate - Escalate contact to dispute
export const escalateToDispute: RequestHandler = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { exchangeId, userId } = req.body;
    const authReq = req as AuthRequest;

    if (!exchangeId || !userId) {
      return res.status(400).json({ 
        message: 'Exchange ID and User ID are required for dispute escalation' 
      });
    }

    const contact = await Contact.findById(id);
    if (!contact) {
      return res.status(404).json({ message: 'Contact not found' });
    }

    if (contact.disputeId) {
      return res.status(400).json({ message: 'Contact already escalated to dispute' });
    }

    // Create dispute from contact
    const dispute = await Dispute.create({
      user: userId,
      exchangeId,
      subject: contact.subject,
      description: `Escalated from contact submission:\n\n${contact.message}`,
      status: 'open',
      messages: [{
        senderType: 'user',
        message: contact.message,
        createdAt: contact.createdAt
      }]
    });

    // Update contact with dispute reference
    contact.disputeId = dispute._id;
    contact.isDispute = true;
    contact.status = 'in_progress';
    await contact.save();

    return res.json({
      message: 'Contact escalated to dispute successfully',
      disputeId: dispute._id,
      contact
    });
  } catch (error: any) {
    console.error('Error escalating to dispute:', error);
    return res.status(500).json({ 
      message: 'Failed to escalate to dispute', 
      error: error.message 
    });
  }
};
