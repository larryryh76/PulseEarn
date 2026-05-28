import { db } from '../../firebase/config';
import {
  doc,
  serverTimestamp,
  runTransaction
} from 'firebase/firestore';
import { SupportTicket, TicketCategory, TicketPriority } from '../../types';

export class SupportEngine {
  /**
   * Opens a new audited support ticket
   */
  static async createTicket(request: {
    userId: string;
    category: TicketCategory;
    priority: TicketPriority;
    subject: string;
    description: string;
    attachedLogIds: string[];
  }): Promise<{ success: boolean; ticketId?: string; error?: string }> {
    try {
      const ticketId = `TKT-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

      const ticket: Omit<SupportTicket, 'id'> = {
        userId: request.userId,
        category: request.category,
        priority: request.priority,
        status: 'OPEN',
        subject: request.subject,
        description: request.description,
        createdAt: serverTimestamp() as any,
        updatedAt: serverTimestamp() as any,
        attachedLogIds: request.attachedLogIds,
        messages: [{
          senderId: request.userId,
          text: request.description,
          timestamp: serverTimestamp() as any
        }]
      };

      await setDoc(doc(db, 'support_tickets', ticketId), {
        ...ticket,
        id: ticketId
      });

      return { success: true, ticketId };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Admin resolution flow
   */
  static async resolveTicket(ticketId: string, adminId: string, resolution: string): Promise<void> {
    const ticketRef = doc(db, 'support_tickets', ticketId);

    await runTransaction(db, async (transaction) => {
      const snap = await transaction.get(ticketRef);
      if (!snap.exists()) throw new Error("TICKET_NOT_FOUND");

      transaction.update(ticketRef, {
        status: 'RESOLVED',
        resolvedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        assignedAdminId: adminId,
        messages: [
          ...snap.data().messages,
          {
            senderId: adminId,
            text: `RESOLUTION: ${resolution}`,
            timestamp: serverTimestamp()
          }
        ]
      });
    });
  }
}

import { setDoc } from 'firebase/firestore';
