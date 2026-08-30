export const PINOCCHIO_PANORAMA = Object.freeze({
  focusX: Object.freeze([4, 16, 28, 40, 52, 64, 78, 92]),
  focusY: 24,
  scale: 1.36,
});

export function shouldShowLessonSkip(isMaster, hasSkipAction) {
  return Boolean(isMaster && hasSkipAction);
}

export function mimicPhraseProgress(activeIndex, total) {
  if (!Number.isInteger(activeIndex) || !Number.isInteger(total) || total < 2) return null;
  const boundedIndex = Math.min(Math.max(activeIndex, 0), total - 1);
  return `PHRASE ${boundedIndex + 1} / ${total}`;
}

export function isVisibleTokenSequenceCorrect(targetTokens, selectedTokenIds) {
  if (targetTokens.length !== selectedTokenIds.length) return false;
  return selectedTokenIds.every((tokenId, index) => targetTokens[tokenId] === targetTokens[index]);
}

export function panoramaViewport(focusX, focusY, scale = PINOCCHIO_PANORAMA.scale) {
  const visibleFraction = 1 / scale;
  const originX = focusX / 100;
  const originY = focusY / 100;
  return {
    left: originX * (1 - visibleFraction),
    right: originX + (1 - originX) * visibleFraction,
    top: originY * (1 - visibleFraction),
    bottom: originY + (1 - originY) * visibleFraction,
    visibleFraction,
  };
}
