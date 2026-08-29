export type StoryBeat = {
  id: string;
  meaningEn: string;
  labelKo: string;
};

export type StoryRetellBrief = {
  titleKo: string;
  minimumBeats: number;
  beats: StoryBeat[];
};

const briefs: Record<string, StoryRetellBrief> = {
  '001:1': {
    titleKo: '큰 무대 앞에서 받은 거절',
    minimumBeats: 2,
    beats: [
      { id: 'scout_watches', meaningEn: 'A talent scout watches Buster’s show.', labelKo: '스카우트가 공연을 보러 왔어요' },
      { id: 'hope_builds', meaningEn: 'The troupe mistakes her reactions for approval.', labelKo: '모두 좋은 반응이라고 믿어요' },
      { id: 'show_rejected', meaningEn: 'She says the show is not ready for the big city.', labelKo: '큰 무대에는 부족하다는 말을 들어요' },
      { id: 'dream_survives', meaningEn: 'Buster keeps pursuing the dream after rejection.', labelKo: '거절당해도 꿈을 포기하지 않아요' },
    ],
  },
  '001:2': {
    titleKo: '기회를 찾아 레드쇼어로',
    minimumBeats: 2,
    beats: [
      { id: 'troupe_reunites', meaningEn: 'Buster gathers his performers for a new audition.', labelKo: '친구들이 다시 한자리에 모여요' },
      { id: 'risk_accepted', meaningEn: 'The troupe chooses the opportunity despite its doubts.', labelKo: '두려워도 도전하기로 해요' },
      { id: 'entry_denied', meaningEn: 'They are refused entry because they have no appointment.', labelKo: '입구에서 거절당해요' },
      { id: 'team_sneaks_in', meaningEn: 'They disguise themselves and enter the audition area.', labelKo: '다른 모습으로 몰래 들어가요' },
    ],
  },
  '001:3': {
    titleKo: '무모한 약속, 3주의 기회',
    minimumBeats: 2,
    beats: [
      { id: 'first_pitch_fails', meaningEn: 'Crystal rejects their small show idea.', labelKo: '첫 번째 공연 아이디어가 거절돼요' },
      { id: 'space_show_emerges', meaningEn: 'A large space musical catches his attention.', labelKo: '거대한 우주 공연을 떠올려요' },
      { id: 'calloway_promised', meaningEn: 'Buster claims he can bring a missing rock star back.', labelKo: '전설적인 가수를 데려오겠다고 약속해요' },
      { id: 'deadline_set', meaningEn: 'Crystal gives the troupe three weeks to deliver.', labelKo: '단 3주 안에 공연을 완성해야 해요' },
    ],
  },
  '001:4': {
    titleKo: '우주 쇼가 모양을 갖추다',
    minimumBeats: 2,
    beats: [
      { id: 'story_is_built', meaningEn: 'The team turns a rough idea into a four-planet journey.', labelKo: '우주 여행 이야기를 만들어요' },
      { id: 'roles_are_cast', meaningEn: 'Each performer receives a different challenge.', labelKo: '친구마다 새로운 역할을 맡아요' },
      { id: 'star_is_found', meaningEn: 'Miss Crawly finds where Calloway lives.', labelKo: '사라진 가수의 집을 찾아내요' },
      { id: 'johnny_struggles', meaningEn: 'Johnny loses confidence under a harsh teacher.', labelKo: '조니가 어려운 춤 앞에서 흔들려요' },
    ],
  },
  '001:5': {
    titleKo: '역할을 흔드는 새로운 변수',
    minimumBeats: 2,
    beats: [
      { id: 'johnny_is_crushed', meaningEn: 'Johnny’s dance teacher keeps undermining him.', labelKo: '조니의 자신감이 점점 작아져요' },
      { id: 'meena_feels_unseen', meaningEn: 'Meena’s partner cares more about himself than her.', labelKo: '미나의 마음을 봐주지 않는 상대를 만나요' },
      { id: 'crawly_reaches_clay', meaningEn: 'Miss Crawly reaches Calloway’s isolated home.', labelKo: '미스 크롤리가 외딴집에 도착해요' },
      { id: 'porsha_enters', meaningEn: 'Crystal’s daughter takes a sudden interest in the show.', labelKo: '포샤가 공연에 끼어들어요' },
      { id: 'rosita_freezes', meaningEn: 'Rosita discovers that she is afraid of the big jump.', labelKo: '로지타가 높은 곳에서 얼어붙어요' },
    ],
  },
  '001:6': {
    titleKo: '빼앗긴 역할, 찾아온 새 코치',
    minimumBeats: 2,
    beats: [
      { id: 'lead_role_taken', meaningEn: 'Crystal pressures Buster to give Rosita’s role to Porsha.', labelKo: '로지타가 주인공 역할을 빼앗겨요' },
      { id: 'hurt_is_hidden', meaningEn: 'Rosita pretends the change does not hurt.', labelKo: '괜찮은 척하지만 마음은 아파요' },
      { id: 'training_breaks_johnny', meaningEn: 'Repeated humiliation makes Johnny’s dancing worse.', labelKo: '심한 꾸중에 조니가 더 움츠러들어요' },
      { id: 'nooshy_discovered', meaningEn: 'Johnny sees Nooshy dancing freely in the street.', labelKo: '자유롭게 춤추는 누시를 발견해요' },
      { id: 'new_help_begins', meaningEn: 'He asks her to help him regain his movement.', labelKo: '조니가 새로운 도움을 청해요' },
    ],
  },
  '001:7': {
    titleKo: '거짓말이 들통난 날',
    minimumBeats: 2,
    beats: [
      { id: 'nooshy_challenges_klaus', meaningEn: 'Nooshy promises to rebuild Johnny’s confidence.', labelKo: '누시가 조니를 다시 춤추게 하겠다고 해요' },
      { id: 'crawly_returns_afraid', meaningEn: 'Miss Crawly returns frightened by Calloway.', labelKo: '미스 크롤리가 겁에 질려 돌아와요' },
      { id: 'porsha_cannot_act', meaningEn: 'Porsha enjoys the role but cannot carry its meaning.', labelKo: '포샤는 신나지만 역할의 마음을 못 살려요' },
      { id: 'lie_is_exposed', meaningEn: 'Crystal discovers that Buster never knew Calloway.', labelKo: '버스터의 거짓말이 들통나요' },
      { id: 'final_chance_given', meaningEn: 'Buster and Ash leave to make one last appeal.', labelKo: '마지막 기회를 잡으러 직접 떠나요' },
    ],
  },
  '001:8': {
    titleKo: '닫힌 마음을 두드리다',
    minimumBeats: 2,
    beats: [
      { id: 'calloway_refuses', meaningEn: 'Calloway rejects both the visitors and the show.', labelKo: '캘러웨이가 공연을 단호히 거절해요' },
      { id: 'meena_meets_alfonso', meaningEn: 'Meena experiences genuine affection for the first time.', labelKo: '미나가 진짜 설레는 사람을 만나요' },
      { id: 'johnny_rebuilds', meaningEn: 'Nooshy restores Johnny’s confidence step by step.', labelKo: '누시가 조니의 자신감을 되살려요' },
      { id: 'grief_is_revealed', meaningEn: 'Ash realizes that Calloway withdrew after losing his wife.', labelKo: '캘러웨이가 마음을 닫은 이유를 알아요' },
      { id: 'ash_stays', meaningEn: 'Ash chooses to remain and reach him through music.', labelKo: '애쉬가 음악으로 곁에 남기로 해요' },
    ],
  },
  '001:9': {
    titleKo: '공연보다 위험해진 갈등',
    minimumBeats: 2,
    beats: [
      { id: 'music_reawakens_clay', meaningEn: 'Ash begins reconnecting Calloway with his songs.', labelKo: '음악이 캘러웨이의 마음을 다시 깨워요' },
      { id: 'rosita_restored', meaningEn: 'Buster returns the lead role to Rosita.', labelKo: '주인공 역할이 로지타에게 돌아와요' },
      { id: 'porsha_misunderstands', meaningEn: 'Porsha believes she was fired and makes it public.', labelKo: '포샤의 오해가 세상에 퍼져요' },
      { id: 'clay_commits', meaningEn: 'Calloway finally agrees to come to the city.', labelKo: '캘러웨이가 공연장으로 오기로 해요' },
      { id: 'crystal_attacks', meaningEn: 'Crystal retaliates against Buster for embarrassing him.', labelKo: '크리스털이 버스터를 위험에 빠뜨려요' },
    ],
  },
  '001:10': {
    titleKo: '도망 대신 무대를 선택하다',
    minimumBeats: 2,
    beats: [
      { id: 'troupe_flees', meaningEn: 'The troupe hides from Crystal’s guards.', labelKo: '모두 경비원들을 피해 달아나요' },
      { id: 'clay_names_choice', meaningEn: 'Calloway explains that hiding is also a choice.', labelKo: '숨는 것도 선택이었다는 걸 깨달아요' },
      { id: 'dream_reclaimed', meaningEn: 'The troupe refuses to let Crystal take its dream.', labelKo: '빼앗긴 꿈을 다시 선택해요' },
      { id: 'escape_succeeds', meaningEn: 'They escape the hotel through the river attraction.', labelKo: '힘을 합쳐 호텔을 빠져나와요' },
      { id: 'secret_show_planned', meaningEn: 'They return in disguise to stage the show themselves.', labelKo: '몰래 돌아가 직접 공연하기로 해요' },
    ],
  },
  '001:11': {
    titleKo: '허락 없이 막을 올리다',
    minimumBeats: 2,
    beats: [
      { id: 'porsha_returns', meaningEn: 'Porsha reconciles with the troupe and accepts a new role.', labelKo: '포샤가 돌아와 새로운 역할을 맡아요' },
      { id: 'backup_arrives', meaningEn: 'Friends and family help distract hotel security.', labelKo: '가족과 친구들이 경비를 따돌려요' },
      { id: 'audience_invited', meaningEn: 'Buster opens the theater to the public for free.', labelKo: '관객을 공연장으로 초대해요' },
      { id: 'show_begins', meaningEn: 'Rosita’s space-rescue story finally comes alive onstage.', labelKo: '준비한 우주 공연이 시작돼요' },
      { id: 'crystal_arrives', meaningEn: 'Crystal reaches the theater while the show continues.', labelKo: '공연 도중 크리스털이 나타나요' },
    ],
  },
  '001:12': {
    titleKo: '모두가 자기 두려움을 넘다',
    minimumBeats: 2,
    beats: [
      { id: 'porsha_owns_stage', meaningEn: 'Porsha performs freely despite her father’s anger.', labelKo: '포샤가 아빠의 방해에도 자기 무대를 만들어요' },
      { id: 'meena_finds_feeling', meaningEn: 'Meena performs from real emotion and approaches Alfonso.', labelKo: '미나가 진짜 마음으로 노래하고 다가가요' },
      { id: 'rosita_makes_jump', meaningEn: 'Rosita overcomes her fear and saves Buster.', labelKo: '로지타가 두려움을 넘어 뛰어내려요' },
      { id: 'clay_returns', meaningEn: 'Ash helps Calloway step back onto the stage.', labelKo: '애쉬와 함께 캘러웨이가 무대로 돌아와요' },
      { id: 'new_stage_opens', meaningEn: 'Crystal is exposed and the troupe receives a new opportunity.', labelKo: '나쁜 행동은 밝혀지고 더 큰 기회가 열려요' },
    ],
  },
  '002:1': {
    titleKo: '위기부터 비밀 공연까지',
    minimumBeats: 2,
    beats: [
      { id: 'roles_under_pressure', meaningEn: 'Crystal’s pressure disrupts the cast and its roles.', labelKo: '권력 때문에 친구들의 역할이 흔들려요' },
      { id: 'confidence_rebuilt', meaningEn: 'Johnny finds healthier help and begins trusting himself.', labelKo: '조니가 자신을 믿는 법을 배워요' },
      { id: 'clay_confronts_grief', meaningEn: 'Ash challenges Calloway to face his grief through music.', labelKo: '캘러웨이가 슬픔과 다시 마주해요' },
      { id: 'conflict_explodes', meaningEn: 'Porsha’s departure triggers Crystal’s violent retaliation.', labelKo: '포샤의 일로 갈등이 폭발해요' },
      { id: 'courage_becomes_action', meaningEn: 'The troupe stops running and launches its own show.', labelKo: '도망을 멈추고 직접 공연을 시작해요' },
    ],
  },
  '003:1': {
    titleKo: '말하는 나무토막',
    minimumBeats: 2,
    beats: [
      { id: 'ordinary_wood_intro', meaningEn: 'The story begins with an ordinary piece of firewood, not a king.', labelKo: '왕이 아니라 평범한 나무토막의 이야기예요' },
      { id: 'wood_reaches_shop', meaningEn: 'The wood arrives at Mastro Cherry’s workshop.', labelKo: '나무토막이 목수의 작업실에 와요' },
      { id: 'wood_speaks', meaningEn: 'A tiny voice asks the carpenter not to strike it.', labelKo: '나무에서 작은 목소리가 들려요' },
      { id: 'carpenter_searches', meaningEn: 'The frightened carpenter searches but finds no one.', labelKo: '목수가 목소리의 주인을 찾아봐요' },
      { id: 'mystery_grows', meaningEn: 'The wood cries and laughs again, overwhelming the carpenter.', labelKo: '나무가 다시 울고 웃자 목수가 깜짝 놀라요' },
    ],
  },
};

export function getStoryRetellBrief(movieId: string): StoryRetellBrief | null {
  return briefs[movieId] || null;
}
