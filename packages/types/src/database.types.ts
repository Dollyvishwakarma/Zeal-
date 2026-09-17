// packages/types/src/database.types.ts
// ═══════════════════════════════════════════════════════════════════════════════
// ZEAL — Complete Supabase Database Types
// Covers all 24 tables + 16 RPC functions + compat views
// ═══════════════════════════════════════════════════════════════════════════════

export type Json =
  | string | number | boolean | null
  | { [key: string]: Json | undefined }
  | Json[];

// ─── Enums ───────────────────────────────────────────────────────────────────
export type Role = "USER" | "CLIENT_ADMIN" | "SUPER_ADMIN" | "ADMIN" | "SUPPORT" | "VIEWER";
export type ConsultantStatus = "PENDING" | "VERIFIED" | "REJECTED" | "SUSPENDED";
export type ConsultantCategory =
  | "ASTROLOGER" | "PSYCHOLOGIST" | "TAROT" | "NUMEROLOGIST" | "PALMIST"
  | "VASTU" | "REIKI" | "LIFE_COACH" | "MOTIVATIONAL_SPEAKER"
  | "SPIRITUAL_GUIDE" | "YOGA_INSTRUCTOR" | "HEALER";
export type Faith = "HINDU" | "ISLAM" | "CHRISTIAN" | "BUDDHIST" | "JEWISH" | "SIKH" | "OTHER";
export type BookingStatus = "PENDING" | "CONFIRMED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED" | "MISSED" | "DISPUTED";
export type CallStatus = "INITIATED" | "CONNECTED" | "ENDED" | "RECORDING_READY";
export type TransactionType = "TOPUP" | "PAYMENT" | "REFUND" | "PAYOUT" | "FEE" | "COMMISSION";

// ─── Table row generic ───────────────────────────────────────────────────────
type Table<Row, Insert = Partial<Row>, Update = Partial<Row>> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
};

export interface Database {
  public: {
    Tables: {
      // ─── Core Identity ────────────────────────────────────────────────────
      User: Table<{
        id: string; email: string; username: string;
        name: string | null; avatar: string | null;
        role: Role; sparks: number; isVerified: boolean;
        is_online: boolean;
        createdAt: string; updatedAt: string;
      }>;

      // Compat view: legacy `profiles` maps to User
      profiles: Table<{
        id: string; email: string; username: string;
        full_name: string | null; avatar_url: string | null;
        role: string; sparks: number;
        wallet_balance: number;
        is_online: boolean;
        onboarding_completed: boolean;
        is_ai: boolean;
        system_prompt: string | null;
        created_at: string; updated_at: string;
      }>;

      UserPreferences: Table<{
        id: string; userId: string;
        interests: string[]; goals: string[]; favoriteConsultants: string[];
        createdAt: string; updatedAt: string;
      }>;

      UserActivity: Table<{
        id: string; userId: string; consultantId: string | null;
        type: string; createdAt: string;
      }>;

      // ─── Financial ────────────────────────────────────────────────────────
      Wallet: Table<{
        id: string; userId: string;
        balance: number; escrow: number;
        pendingIn: number; pendingOut: number; blocked: number;
        createdAt: string; updatedAt: string;
      }>;

      Transaction: Table<{
        id: string; walletId: string; type: TransactionType;
        amount: number; balance: number; description: string;
        referenceId: string | null; metadata: Json | null;
        createdAt: string;
      }>;

      // Legacy ledger (compat)
      wallet_ledger: Table<{
        id: string; user_id: string; amount: number;
        transaction_type: "CREDIT" | "DEBIT" | "HOLD" | "REFUND";
        gateway: string; reference_id: string | null;
        status: string; created_at: string;
      }>;

      // ─── Consultants ──────────────────────────────────────────────────────
      Consultant: Table<{
        id: string; userId: string; category: ConsultantCategory;
        specialties: string[]; languages: string[]; bio: string | null;
        perMinuteRate: number; isVerified: boolean; isActive: boolean;
        faith: Faith; rating: number; totalConsultations: number; earnings: number;
        availability: Json; status: ConsultantStatus;
        verificationDocs: Json | null; rejectionReason: string | null;
        approvedBy: string | null; approvedAt: string | null;
        subdomain: string | null; subdomainActive: boolean;
        whiteLabelEnabled: boolean; theme: Json | null;
        chatRate: number | null; audioRate: number | null;
        videoRate: number | null; physicalRate: number | null;
        bufferMinutes: number; createdAt: string; updatedAt: string;
      }>;

      AIConsultant: Table<{
        id: string; name: string; username: string; avatar: string;
        category: string; isPaid: boolean; perMinuteRate: number; rating: number;
        experience: number; totalConsultations: number; sparks: number;
        bio: string; specialties: string[]; languages: string[]; model: string;
        responseTime: number; accuracy: number; isActive: boolean;
        gender: string | null; persona: string | null; voiceStyle: string | null;
        isFeatured: boolean; createdAt: string; updatedAt: string;
      }>;

      // ─── Consultations (legacy compat) ────────────────────────────────────
      consultations: Table<{
        id: string; client_id: string; consultant_id: string;
        service_type: "CHAT" | "AUDIO" | "VIDEO" | "PHYSICAL";
        status: "PENDING" | "ACTIVE" | "COMPLETED" | "CANCELLED" | "TERMINATED";
        rate_per_minute: number; total_cost: number;
        started_at: string | null; ended_at: string | null;
        created_at: string;
      }>;

      // ─── Bookings & Calls ─────────────────────────────────────────────────
      Booking: Table<{
        id: string; userId: string | null; consultantId: string;
        scheduledAt: string; durationMinutes: number; status: BookingStatus;
        meetingLink: string | null; externalEmail: string | null;
        paymentId: string | null; amount: number;
        platformFee: number; consultantEarning: number;
        rating: number | null; review: string | null;
        createdAt: string; updatedAt: string;
      }>;

      CallSession: Table<{
        id: string; bookingId: string | null; userId: string;
        consultantId: string | null; isAI: boolean; aiConsultantId: string | null;
        startTime: string; endTime: string | null; durationSeconds: number;
        amount: number; status: CallStatus;
        recordingUrl: string | null; recordingReady: boolean;
        createdAt: string; updatedAt: string;
      }>;

      // ─── Social ───────────────────────────────────────────────────────────
      Post: Table<{
        id: string; content: string; mediaUrls: string[]; authorId: string;
        cheerCount: number; commentCount: number; shareCount: number;
        isPinned: boolean; isFlagged: boolean;
        createdAt: string; updatedAt: string;
      }>;

      Comment: Table<{
        id: string; content: string; authorId: string; postId: string;
        parentId: string | null; createdAt: string; updatedAt: string;
      }>;

      Cheer: Table<{ id: string; userId: string; postId: string; createdAt: string }>;

      Notification: Table<{
        id: string; userId: string; type: string; message: string;
        redirectUrl: string | null; read: boolean; actorId: string;
        createdAt: string; updatedAt: string;
      }>;

      // ─── Chat ─────────────────────────────────────────────────────────────
      Conversation: Table<{
        id: string; createdAt: string; lastMessageAt: string;
        lastMessageText: string | null; isGroup: boolean; metadata: Json | null;
      }>;

      ConversationParticipant: Table<{
        conversationId: string; userId: string; joinedAt: string;
        lastReadAt: string | null; role: string;
      }>;

      Message: Table<{
        id: string; conversationId: string; senderId: string | null;
        content: string; type: string; metadata: Json | null;
        createdAt: string; editedAt: string | null; deletedAt: string | null;
      }>;

      // Legacy chat (compat)
      ChatMessage: Table<{
        id: string; conversationId: string; senderId: string;
        content: string; readAt: string | null; createdAt: string;
      }>;

      // Legacy session_messages (compat)
      session_messages: Table<{
        id: string; session_id: string; sender_id: string;
        content: string; created_at: string;
      }>;

      session_requests: Table<{
        id: string; seeker_id: string; consultant_id: string;
        status: string; created_at: string;
      }>;

      // ─── Admin ────────────────────────────────────────────────────────────
      AdminAuditLog: Table<{
        id: string; userId: string | null; email: string | null;
        action: string; targetType: string | null; targetId: string | null;
        metadata: Json | null; ip: string | null; userAgent: string | null;
        success: boolean; createdAt: string;
      }>;

      AdminInvite: Table<{
        id: string; email: string; role: Role; tokenHash: string;
        invitedBy: string; expiresAt: string;
        acceptedAt: string | null; revokedAt: string | null;
        createdAt: string;
      }>;

      AdminLoginAttempt: Table<{
        id: string; email: string; ip: string | null;
        success: boolean; reason: string | null; createdAt: string;
      }>;

      DebugLog: Table<{
        id: string; createdAt: string; level: string; channel: string;
        event: string; message: string | null; data: Json | null;
        durationMs: number | null; requestId: string | null;
        userId: string | null; route: string | null;
      }>;
    };

    Views: Record<string, never>;

    Functions: {
      // ─── Wallet RPCs ──────────────────────────────────────────────────────
      process_wallet_deduction: {
        Args: {
          p_user_id: string; p_amount: number; p_description: string;
          p_reference_id?: string | null;
          p_transaction_type?: TransactionType;
          p_metadata?: Json | null;
        };
        Returns: Json;
      };
      process_wallet_deduction_safe: {
        Args: {
          p_user_id: string; p_amount: number; p_description: string;
          p_reference_id?: string | null;
          p_transaction_type?: TransactionType;
        };
        Returns: Json;
      };
      process_wallet_topup: {
        Args: {
          p_user_id: string; p_amount: number; p_description: string;
          p_reference_id?: string | null; p_metadata?: Json | null;
        };
        Returns: Json;
      };
      credit_funds_safe: {
        Args: {
          p_user_id: string; p_amount: number;
          p_description: string; p_reference_id: string | null;
        };
        Returns: Json;
      };
      hold_in_escrow_safe: {
        Args: {
          p_user_id: string; p_amount: number;
          p_reference_id: string; p_description: string;
        };
        Returns: Json;
      };
      process_escrow_release: {
        Args: {
          p_booking_id: string; p_consultant_id: string;
          p_consultant_earning: number; p_platform_fee: number;
        };
        Returns: Json;
      };
      ledger_debit: {
        Args: {
          p_wallet_id: string; p_amount: number; p_type: TransactionType;
          p_description: string; p_reference_id: string | null;
          p_metadata?: Json;
        };
        Returns: Json;
      };
      ledger_credit: {
        Args: {
          p_wallet_id: string; p_amount: number; p_type: TransactionType;
          p_description: string; p_reference_id: string | null;
          p_metadata?: Json;
        };
        Returns: Json;
      };
      ledger_transfer: {
        Args: {
          p_from_wallet: string; p_to_wallet: string; p_amount: number;
          p_reference_id: string; p_description: string;
        };
        Returns: Json;
      };

      // ─── Consultation RPCs ────────────────────────────────────────────────
      pulse_deduct_inr: {
        Args: { p_consultation_id: string; p_client_id: string };
        Returns: Json;
      };
      increment_spark: {
        Args: { p_consultant_id: string };
        Returns: undefined;
      };
      increment_comment_count: {
        Args: { p_post_id: string };
        Returns: number;
      };
      toggle_cheer: {
        Args: { p_user_id: string; p_post_id: string };
        Returns: Json;
      };
      claim_quest: {
        Args: { p_user_id: string; p_quest_id: string; p_reward: number };
        Returns: Json;
      };

      // ─── Booking RPCs ─────────────────────────────────────────────────────
      cancel_booking: {
        Args: { p_booking_id: string; p_actor_id: string };
        Returns: Json;
      };
      check_booking_conflict: {
        Args: {
          p_consultant_id: string; p_start: string;
          p_duration_minutes: number;
        };
        Returns: boolean;
      };
      end_call_session: {
        Args: { p_session_id: string };
        Returns: Json;
      };

      // ─── Withdrawal RPCs ──────────────────────────────────────────────────
      request_withdrawal: {
        Args: {
          p_user_id: string; p_amount: number;
          p_upi: string; p_bank: string;
        };
        Returns: Json;
      };
      process_withdrawal: {
        Args: {
          p_tx_id: string; p_action: string;
          p_reason?: string | null;
        };
        Returns: Json;
      };

      // ─── Admin RPCs ───────────────────────────────────────────────────────
      verify_consultant: {
        Args: {
          p_consultant_id: string; p_admin_id: string; p_action: string;
          p_reason?: string | null; p_subdomain?: string | null;
        };
        Returns: Json;
      };

      // ─── Chat RPCs ────────────────────────────────────────────────────────
      get_or_create_conversation: {
        Args: { p_user_a: string; p_user_b: string };
        Returns: string;
      };
    };

    Enums: {
      Role: Role;
      ConsultantStatus: ConsultantStatus;
      ConsultantCategory: ConsultantCategory;
      Faith: Faith;
      BookingStatus: BookingStatus;
      CallStatus: CallStatus;
      TransactionType: TransactionType;
    };
  };
}