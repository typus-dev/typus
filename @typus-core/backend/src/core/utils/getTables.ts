
export async function getDatabaseTables(): Promise<string[]> {
  try {

    
    let tables: string[] = [];

        tables = await getMysqlTables();
    
    return tables;
  } catch (error) {
       global.logger.error('Failed to get database tables', { error });
    return [];
  }
}

/**
 * Get MySQL tables
 */
async function getMysqlTables(): Promise<string[]> {
  const result = await global.prisma.$queryRaw<Array<{ TABLE_NAME: string }>>`
    SELECT TABLE_NAME 
    FROM information_schema.TABLES 
    WHERE TABLE_SCHEMA = DATABASE()
  `;
  
  return result.map(row => row.TABLE_NAME);
}


