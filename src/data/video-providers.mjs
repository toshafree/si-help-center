// Source: tmp/youtube-rutube.csv. Values are arrays because the source table can be ambiguous.
export const youtubeUrlsByRutubeId = Object.freeze({
  '3cd1a6283623bf318a132724cb545e70': ['https://youtu.be/91iozEzYIng'],
  '3e3c03429baaf4dc6cd5a6bb6aef3142': ['https://youtu.be/uK88zY67xT0'],
  c697168a2d503cb3eac49d32bffad29d: ['https://youtu.be/Dz83OxPib6U'],
  '564d5f672655b453e7763cfbe5392d1d': ['https://youtu.be/Y2QzEk7-WLc'],
  df9ac2467fc80a76ba6a3def3ceecd0a: ['https://youtu.be/52o813QNIds'],
  '5638973d16f74cb4d09fe15b3a630552': ['https://youtu.be/wkdBKOpYHik'],
  b726db2ceb93e676c4ae66126c2ec625: [
    'https://youtu.be/y8kXM0ukAeA',
    'https://youtu.be/u12EBlUOUs8',
  ],
  '2666c7916bc077e993439fa631e52757': ['https://youtu.be/-zvKE6QANLc'],
  ec2684dbe324f14b2ca30ff9425beeca: ['https://youtu.be/fNTvVDq_l6o'],
  b565f99c59862ece45e3e69bb4fc0060: ['https://youtu.be/K6JTIrr0HiQ'],
  e3dd55aab936e745b683a0b238242c5f: ['https://youtu.be/2-IIIly-XDc'],
  '04c313a2cc60cc539b151f45a2b98b03': ['https://youtu.be/GVH2Ek2Sx84'],
  e5040e7531426d71324db878a50010b5: ['https://youtu.be/nuYZz681v6U'],
  b33facf93fc9e8fc657d03d8e292ee15: ['https://youtu.be/BnkAP9N0jRk'],
});

export function youtubeUrlForRutubeId(rutubeId) {
  const candidates = youtubeUrlsByRutubeId[rutubeId] ?? [];
  return candidates.length === 1 ? candidates[0] : undefined;
}
