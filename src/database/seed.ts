import { drizzle } from 'drizzle-orm/node-postgres';
import { Client } from 'pg';
import * as bcrypt from 'bcrypt';
import * as dotenv from 'dotenv';
import { roles, users } from './schema';

dotenv.config();

async function seed() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  await client.connect();
  const db = drizzle(client);

  try {
    console.log('🌱 Starting database seeding...');

    // Seed roles
    console.log('📝 Seeding roles...');
    await db
      .insert(roles)
      .values([
        { id: 1, name: 'admin' },
        { id: 2, name: 'teacher' },
      ])
      .onConflictDoNothing();

    // Seed admin user
    console.log('👤 Seeding admin user...');
    const hashedAdminPassword = await bcrypt.hash('admin123', 10);
    await db
      .insert(users)
      .values({
        name: 'Super Admin',
        email: 'admin@example.com',
        password: hashedAdminPassword,
        roleId: 1, // admin role
      })
      .onConflictDoNothing();

    // Seed teacher user
    console.log('👨‍🏫 Seeding teacher user...');
    const hashedTeacherPassword = await bcrypt.hash('teacher123', 10);
    await db
      .insert(users)
      .values({
        name: 'John Teacher',
        email: 'teacher@example.com',
        password: hashedTeacherPassword,
        roleId: 2, // teacher role
      })
      .onConflictDoNothing();

    console.log('✅ Database seeding completed successfully!');
    console.log('📋 Default accounts:');
    console.log('   Admin: admin@example.com / admin123');
    console.log('   Teacher: teacher@example.com / teacher123');
  } catch (error) {
    console.error('❌ Error seeding database:', error);
  } finally {
    await client.end();
  }
}

seed();
