## Question
Discover currently does server `sort=random` (ORDER BY RANDOM) + client `shuffleArray` double-shuffle. Should client shuffle be removed so PWA and browser see identical server order, or should shuffle be deterministic (seeded by day/user) to keep Find loop in sync across contexts?
