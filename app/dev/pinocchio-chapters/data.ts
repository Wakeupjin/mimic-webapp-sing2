import rawPack01 from "../../../content-packs/pinocchio/v2/sessions/session-01/pack.json";
import rawPack02 from "../../../content-packs/pinocchio/v2/sessions/session-02/pack.json";
import rawPack03 from "../../../content-packs/pinocchio/v2/sessions/session-03/pack.json";
import rawPack04 from "../../../content-packs/pinocchio/v2/sessions/session-04/pack.json";
import rawPack05 from "../../../content-packs/pinocchio/v2/sessions/session-05/pack.json";
import rawPack06 from "../../../content-packs/pinocchio/v2/sessions/session-06/pack.json";
import rawPack07 from "../../../content-packs/pinocchio/v2/sessions/session-07/pack.json";
import rawPack08 from "../../../content-packs/pinocchio/v2/sessions/session-08/pack.json";
import rawPack09 from "../../../content-packs/pinocchio/v2/sessions/session-09/pack.json";
import rawPack10 from "../../../content-packs/pinocchio/v2/sessions/session-10/pack.json";
import rawPack11 from "../../../content-packs/pinocchio/v2/sessions/session-11/pack.json";
import rawPack12 from "../../../content-packs/pinocchio/v2/sessions/session-12/pack.json";
import type { PinocchioPack } from "./types";

const packs = [
  rawPack01,
  rawPack02,
  rawPack03,
  rawPack04,
  rawPack05,
  rawPack06,
  rawPack07,
  rawPack08,
  rawPack09,
  rawPack10,
  rawPack11,
  rawPack12,
] as unknown as PinocchioPack[];

export const TOTAL_CHAPTERS = packs.length;

export function getChapterPack(chapterNumber: number) {
  const pack = packs[chapterNumber - 1];
  return pack?.course.session === chapterNumber ? pack : undefined;
}
