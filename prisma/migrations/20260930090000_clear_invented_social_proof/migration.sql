-- Remove the three social-proof figures that were invented at build time.
--
-- "5,500+" followers, "400+" events served and "6+" years were written as
-- build-time defaults, never checked against anything, and printed in the
-- homepage hero and the site footer as statements of fact. Blanking the
-- default in code is not enough on its own: saving the Settings form writes
-- every field, so any shop that has ever pressed Save has these stored as
-- real rows, and a stored row beats the default.
--
-- Deleting the row is what actually takes them off the site. It is matched on
-- the exact invented string, so a figure the shop has since typed itself --
-- anything other than these three literals -- is left alone. After this runs,
-- whatever is entered in Settings persists normally, including a deliberately
-- empty value, which now means "do not display this".
DELETE FROM "Setting" WHERE "key" = 'followerCount' AND "value" = '5,500+';
DELETE FROM "Setting" WHERE "key" = 'eventsCount'   AND "value" = '400+';
DELETE FROM "Setting" WHERE "key" = 'yearsCount'    AND "value" = '6+';
