## Question
Discover loop only subscribes to `favorite/share/contact` realtime, not `listing` create/delete/hide (30d ghost prune). PWA stays triplicated stale until reload while browser hard-refresh sees new set. Should it subscribe to `listing` (create → prepend/shuffle, delete/hide → filter) to keep loop membership in sync?
