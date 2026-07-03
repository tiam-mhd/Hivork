-- IFP-094: PaymentAttempt VOIDED status for confirmed payment reversal
ALTER TYPE "payment_attempt_status" ADD VALUE 'VOIDED';
