export interface StudioAlbum {
  id: string;
  title: string;
  artist: string;
  file: string;
  spotifyUrl: string;
}

/** The framed collection above the listening console stays separate from the loose records. */
export const STUDIO_WALL_ALBUMS: readonly StudioAlbum[] = [
  {
    id: 'forest-hills-drive', title: '2014 Forest Hills Drive', artist: 'J. Cole', file: '/room/forest-hills.jpg',
    spotifyUrl: 'https://open.spotify.com/album/7viNUmZZ8ztn2UB4XB3jIL',
  },
  {
    id: '4-your-eyez-only', title: '4 Your Eyez Only', artist: 'J. Cole', file: '/room/4-your-eyez-only.jpg',
    spotifyUrl: 'https://open.spotify.com/album/3CCnGldVQ90c26aFATC1PW',
  },
  {
    id: 'melt-my-eyez', title: 'Melt My Eyez See Your Future', artist: 'Denzel Curry', file: '/room/melt-my-eyez.jpg',
    spotifyUrl: 'https://open.spotify.com/album/7KtyUeiJidoZO0ybxBXw0Q',
  },
  {
    id: 'alfredo', title: 'Alfredo', artist: 'Freddie Gibbs & The Alchemist', file: '/room/alfredo.jpg',
    spotifyUrl: 'https://open.spotify.com/album/0aekYX1ALNkZ713PMNrWWx',
  },
];

export const STUDIO_TABLE_ALBUMS: readonly StudioAlbum[] = [
  {
    id: 'good-kid-maad-city', title: 'good kid, m.A.A.d city', artist: 'Kendrick Lamar', file: '/room/good-kid-maad-city.jpg',
    spotifyUrl: 'https://open.spotify.com/album/1V8ZRzcW8bTYYCGFWyznBG',
  },
  {
    id: 'the-great-escape', title: 'The Great Escape', artist: 'Larry June & The Alchemist', file: '/room/the-great-escape.jpg',
    spotifyUrl: 'https://open.spotify.com/album/1AJrpzYu5KAbDSvmyiIUhr',
  },
  {
    id: 'the-forever-story', title: 'The Forever Story', artist: 'JID', file: '/room/the-forever-story.jpg',
    spotifyUrl: 'https://open.spotify.com/album/3QVjpIxcksDkJmOnvlOJjg',
  },
];

export const STUDIO_ALL_ALBUMS: readonly StudioAlbum[] = [...STUDIO_WALL_ALBUMS, ...STUDIO_TABLE_ALBUMS];
