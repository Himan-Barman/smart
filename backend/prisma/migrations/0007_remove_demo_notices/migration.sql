DELETE FROM "Notice"
WHERE "id" IN ('n1', 'n2', 'n3', 'n4', 'n5', 'n6');

DELETE FROM "Notification"
WHERE "title" = 'New Notice Posted'
  AND "desc" = 'Mid-semester exam schedule released for all departments.';
