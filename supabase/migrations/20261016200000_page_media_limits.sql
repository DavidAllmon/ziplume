-- Ziplume is free, so files stay small (page enhancements, release 1): no video files, and every
-- file in page-media is at most 15 MB. The app checks the smaller caps (PDFs up to 10 MB, audio up
-- to 15 MB). Files already stored are untouched and keep working.
update storage.buckets
   set file_size_limit = 15728640,
       allowed_mime_types = array[
         'image/png', 'image/jpeg', 'image/webp', 'image/gif',
         'application/pdf',
         'audio/mpeg', 'audio/mp4', 'audio/aac', 'audio/wav', 'audio/x-wav', 'audio/ogg', 'audio/webm'
       ]
 where id = 'page-media';
