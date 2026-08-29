export const ABILITIES = {
  bloom: { name: 'RE:BLOOM', color: 0x83e85d, css: '#83e85d' },
  freeze: { name: 'RE:FREEZE', color: 0x66d8ff, css: '#66d8ff' },
  pulse: { name: 'RE:PULSE', color: 0xffc44f, css: '#ffc44f' },
};

export const REGION_INFO = {
  hub: { name: 'CENTRAL HUB', spawn: [0, 1, 8], objective: '부서진 세계의 핵과 세 지역의 랜드마크를 살펴보세요.' },
  bloom: { name: 'RE:BLOOM · 생명의 지역', spawn: [0, 1, -60], objective: '거대한 죽은 나무까지 이동해 뿌리 봉인을 해제하세요.' },
  bloomDungeon: { name: '생명의 심장 · 테스트룸', spawn: [0, 1, -258], objective: 'RE:BLOOM → RE:FREEZE → RE:PULSE로 생명의 흐름을 연결하세요.' },
  freeze: { name: 'RE:FREEZE · 정지의 지역', spawn: [63, 1, 35], objective: '움직이는 유적의 필요한 순간을 고정해 공중정원으로 오르세요.' },
  pulse: { name: 'RE:PULSE · 기계의 지역', spawn: [-63, 1, 35], objective: '룬 에너지를 잠든 거인에게 연결해 심장을 깨우세요.' },
};

export const STORAGE_KEY = 'relink-prototype-progress-v1';
