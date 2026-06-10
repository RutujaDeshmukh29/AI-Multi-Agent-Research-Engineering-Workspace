import asyncio
import asyncpg

async def main():
    conn = await asyncpg.connect(
        host="db.ryryortlfjlqjztkswir.supabase.co",
        port=5432,
        user="postgres",
        password="Rutuja_2829",
        database="postgres",
        ssl="require"
    )

    print("Connected successfully!")
    await conn.close()

asyncio.run(main())