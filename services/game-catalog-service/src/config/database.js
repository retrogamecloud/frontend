import { MongoClient } from 'mongodb';

const url = process.env.MONGODB_URL || 'mongodb://localhost:27017/gamehub_catalog';
const client = new MongoClient(url);

let db;

export async function connectDatabase() {
  try {
    await client.connect();
    db = client.db();
    console.log('✅ Connected to MongoDB');

    // Create indexes
    await db.collection('games').createIndex({ slug: 1 }, { unique: true });
    await db.collection('games').createIndex({ name: 'text', description: 'text' });
    await db.collection('games').createIndex({ tags: 1 });

    // Seed initial data if empty
    const count = await db.collection('games').countDocuments();
    if (count === 0) {
      await seedGames();
    }
  } catch (error) {
    console.error('MongoDB connection error:', error);
    throw error;
  }
}

async function seedGames() {
  const games = [
    {
      slug: 'doom',
      name: 'DOOM',
      description: 'The legendary first-person shooter that defined the genre',
      thumbnail: '/img/doom-thumb.jpg',
      file_url: '/doom.jsdos',
      year: 1993,
      developer: 'id Software',
      tags: ['fps', 'action', 'classic'],
      controls: {
        movement: 'Arrow keys or WASD',
        shoot: 'CTRL',
        use: 'SPACE',
        run: 'SHIFT',
        weapons: '1-7'
      }
    },
    {
      slug: 'wolf',
      name: 'Wolfenstein 3D',
      description: 'The grandfather of 3D shooters',
      thumbnail: '/img/wolf-thumb.jpg',
      file_url: '/wolf.jsdos',
      year: 1992,
      developer: 'id Software',
      tags: ['fps', 'action', 'classic']
    },
    {
      slug: 'dangerousdave2',
      name: 'Dangerous Dave 2',
      description: 'Classic platformer adventure',
      thumbnail: '/img/dangerous-thumb.jpg',
      file_url: '/dangerousdave2.jsdos',
      year: 1990,
      developer: 'Softdisk',
      tags: ['platformer', 'adventure', 'classic']
    },
    {
      slug: 'digger',
      name: 'Digger',
      description: 'Retro arcade digging game',
      thumbnail: '/img/digger-thumb.jpg',
      file_url: '/digger.jsdos',
      year: 1983,
      developer: 'Windmill Software',
      tags: ['arcade', 'puzzle', 'retro']
    },
    {
      slug: 'dukenukem3d',
      name: 'Duke Nukem 3D',
      description: 'Hail to the king, baby!',
      thumbnail: '/img/duke3d-thumb.jpg',
      file_url: '/duke3d.jsdos',
      year: 1996,
      developer: '3D Realms',
      tags: ['fps', 'action', 'classic']
    },
    {
      slug: 'heroesofmightandmagic2',
      name: 'Heroes of Might and Magic II',
      description: 'Epic turn-based strategy game',
      thumbnail: '/img/heroes-thumb.jpg',
      file_url: '/heroesofmightandmagic2.jsdos',
      year: 1996,
      developer: 'New World Computing',
      tags: ['strategy', 'turn-based', 'fantasy']
    },
    {
      slug: 'lostvikings',
      name: 'The Lost Vikings',
      description: 'Puzzle-platformer with three unique characters',
      thumbnail: '/img/lost-thumb.jpg',
      file_url: '/lostvikings.jsdos',
      year: 1992,
      developer: 'Silicon & Synapse (Blizzard)',
      tags: ['platformer', 'puzzle', 'adventure']
    },
    {
      slug: 'mortalkombat',
      name: 'Mortal Kombat',
      description: 'Brutal fighting game classic',
      thumbnail: '/img/mortal-thumb.jpg',
      file_url: '/mortalkombat.jsdos',
      year: 1992,
      developer: 'Midway',
      tags: ['fighting', 'arcade', 'action']
    },
    {
      slug: 'streetfighter2',
      name: 'Street Fighter II',
      description: 'The ultimate fighting game',
      thumbnail: '/img/street-thumb.jpg',
      file_url: '/streetfighter2.jsdos',
      year: 1991,
      developer: 'Capcom',
      tags: ['fighting', 'arcade', 'action']
    },
    {
      slug: 'tetris',
      name: 'Tetris',
      description: 'The timeless puzzle game',
      thumbnail: '/img/tetris-thumb.jpg',
      file_url: '/tetris.jsdos',
      year: 1984,
      developer: 'Alexey Pajitnov',
      tags: ['puzzle', 'arcade', 'classic']
    }
  ];

  await db.collection('games').insertMany(games);
  console.log('✅ Seeded game catalog with', games.length, 'games');
}

export function getDatabase() {
  return db;
}

export default { connectDatabase, getDatabase };
