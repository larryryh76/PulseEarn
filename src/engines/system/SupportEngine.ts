import { db } from '../../firebase/config';
import {
  collection,
  doc,
  updateDoc,
  serverTimestamp,
  writeBatch
} from 'firebase/firestore';
import { SupportTicket, SupportMessage, SupportAttachment, TicketCategory } from '../../types';
import { ActivityEngine } from './ActivityEngine';

export class SupportEngine {
  /**
   * INITIATE TICKET
   * Creates a new support ticket and logs the initial message.
   */
  static async createTicket(params: {
    userId: string;
    username: string;
    email: string;
    category: TicketCategory;
    subject: string;
    message: string;
    attachments?: { url: string; name: string; type: string; size: number }[];
  }): Promise<{ success: boolean; ticketId?: string; error?: string }> {
    try {
      const ticketRef = doc(collection(db, 'support_tickets'));
      const ticketId = ticketRef.id;

      const newTicket: SupportTicket = {
        id: ticketId,
        userId: params.userId,
        username: params.username,
        email: params.email,
        category: params.category,
        priority: 'MEDIUM', // Default priority
        status: 'OPEN',
        subject: params.subject,
        lastReplyAt: serverTimestamp() as any,
        createdAt: serverTimestamp() as any,
        updatedAt: serverTimestamp() as any,
        lastMessagePreview: params.message.slice(0, 100),
      };

      const batch = writeBatch(db);
      batch.set(ticketRef, newTicket);

      // Create initial message
      const messageRef = doc(collection(db, 'support_messages'));
      const initialMessage: SupportMessage = {
        id: messageRef.id,
        ticketId: ticketId,
        senderId: params.userId,
        senderType: 'USER',
        senderName: params.username,
        text: params.message,
        createdAt: serverTimestamp() as any,
      };

      // Handle attachments if any
      if (params.attachments && params.attachments.length > 0) {
        const supportAttachments: SupportAttachment[] = params.attachments.map((at, idx) => ({
          id: `att_${ticketId}_${idx}_${Date.now()}`,
          ticketId,
          storageUrl: at.url,
          fileName: at.name,
          fileType: at.type,
          fileSize: at.size,
          uploadedAt: serverTimestamp() as any
        }));
        initialMessage.attachments = supportAttachments;
      }

      batch.set(messageRef, initialMessage);
      await batch.commit();

      // Log Activity
      await ActivityEngine.log({
        userId: params.userId,
        type: 'support_ticket_created',
        description: `Opened Support Ticket: ${params.subject}`,
        referenceId: ticketId,
        metadata: {
          ticketId,
          category: params.category,
          status: 'OPEN'
        }
      });

      return { success: true, ticketId };
    } catch (error: any) {
      console.error('[SupportEngine] Create Failed:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * SEND MESSAGE
   * Appends a message to an existing ticket.
   */
  static async sendMessage(params: {
    ticketId: string;
    senderId: string;
    senderName: string;
    senderType: 'USER' | 'ADMIN' | 'SYSTEM';
    text: string;
    attachments?: { url: string; name: string; type: string; size: number }[];
  }): Promise<{ success: boolean; error?: string }> {
    try {
      const messageRef = doc(collection(db, 'support_messages'));
      const newMessage: SupportMessage = {
        id: messageRef.id,
        ticketId: params.ticketId,
        senderId: params.senderId,
        senderType: params.senderType,
        senderName: params.senderName,
        text: params.text,
        createdAt: serverTimestamp() as any,
      };

      if (params.attachments && params.attachments.length > 0) {
        newMessage.attachments = params.attachments.map((at, idx) => ({
          id: `att_${params.ticketId}_msg_${Date.now()}_${idx}`,
          ticketId: params.ticketId,
          storageUrl: at.url,
          fileName: at.name,
          fileType: at.type,
          fileSize: at.size,
          uploadedAt: serverTimestamp() as any
        }));
      }

      const batch = writeBatch(db);
      batch.set(messageRef, newMessage);

      // Update Ticket Metadata
      const ticketRef = doc(db, 'support_tickets', params.ticketId);
      batch.update(ticketRef, {
        updatedAt: serverTimestamp(),
        lastReplyAt: serverTimestamp(),
        lastMessagePreview: params.text.slice(0, 100),
        status: params.senderType === 'ADMIN' ? 'AWAITING_USER' : 'PENDING'
      });

      await batch.commit();

      // Log Activity for User if Admin Replied
      if (params.senderType === 'ADMIN') {
        // Need to get userId from ticket first, usually handled in caller or by subscription
        // For now, let the caller handle UI activity logs if needed
      }

      return { success: true };
    } catch (error: any) {
      console.error('[SupportEngine] Send Failed:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * UPDATE STATUS
   * Administrative status mutations.
   */
  static async updateStatus(ticketId: string, status: SupportTicket['status']): Promise<void> {
    const ticketRef = doc(db, 'support_tickets', ticketId);
    const updates: any = { status, updatedAt: serverTimestamp() };

    if (status === 'RESOLVED') updates.resolvedAt = serverTimestamp();
    if (status === 'CLOSED') updates.closedAt = serverTimestamp();

    await updateDoc(ticketRef, updates);
  }

  /**
   * ASSIGN ADMIN
   */
  static async assignAdmin(ticketId: string, adminId: string): Promise<void> {
    const ticketRef = doc(db, 'support_tickets', ticketId);
    await updateDoc(ticketRef, {
      assignedAdminId: adminId,
      status: 'IN_PROGRESS',
      updatedAt: serverTimestamp()
    });
  }
}
