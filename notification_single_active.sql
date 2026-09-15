-- Moriki SMS notification system
-- Add single-active-notification support

ALTER TABLE public.notifications
ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

ALTER TABLE public.notifications
ADD COLUMN IF NOT EXISTS published_at timestamptz;

CREATE INDEX IF NOT EXISTS notifications_active_created_idx
ON public.notifications (is_active, created_at DESC);

-- Archive all existing notifications.
-- The next notification created from the admin dashboard
-- will become the new active notification.
UPDATE public.notifications
SET is_active = false
WHERE is_active = true;
