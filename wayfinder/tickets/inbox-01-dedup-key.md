## Question
Inbox `displayConvos` dedup currently by `key` (`thread-{listingId}-{otherId}` vs `thread-{buyerId}-{sellerId}`) leaves pending + real duplicate when per-person Conversation migrates. Should dedup be by `otherUser.id` and should `expanded` resolve to real conversation key instead of pending key?
