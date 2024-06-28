-- CreateTable
CREATE TABLE "User" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "tg_url" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "AppLink" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "price" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "url" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "Subscription" (
    "userId" INTEGER NOT NULL,
    "appLinkId" INTEGER NOT NULL,

    PRIMARY KEY ("userId", "appLinkId"),
    CONSTRAINT "Subscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Subscription_appLinkId_fkey" FOREIGN KEY ("appLinkId") REFERENCES "AppLink" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_tg_url_key" ON "User"("tg_url");
