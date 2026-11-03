/* Shared community details for in-game and static support pages. */
G.Community = Object.freeze({
  groupId: '1130271119',
  resultInviteChance: 0.15,
  shouldInviteAtEnd() { return Math.random() < this.resultInviteChance; }
});
