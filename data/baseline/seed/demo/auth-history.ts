/**
 * Demo Auth History Seed
 *
 * Generates realistic login history for last 30 days
 * Includes successful logins, failed attempts, different devices
 */

import { PrismaClient } from '../../../prisma/generated/client/index.js';

// Demo users (matching 003-demo-data.ts)
// User IDs: 1=system admin, 2-3=admins, 4-11=managers, 12-26=editors, 27-51=users
const demoUsers = [
  { id: 1, email: 'admin@typus', name: 'Admin' },
  { id: 2, email: 'john.smith@example.com', name: 'John Smith' },
  { id: 3, email: 'sarah.johnson@example.com', name: 'Sarah Johnson' },
  { id: 4, email: 'mike.williams@example.com', name: 'Mike Williams' },
  { id: 5, email: 'emma.brown@example.com', name: 'Emma Brown' },
  { id: 6, email: 'alex.davis@example.com', name: 'Alex Davis' },
  { id: 7, email: 'lisa.martinez@example.com', name: 'Lisa Martinez' },
  { id: 8, email: 'david.wilson@example.com', name: 'David Wilson' },
  { id: 9, email: 'jennifer.garcia@example.com', name: 'Jennifer Garcia' },
  { id: 10, email: 'robert.anderson@example.com', name: 'Robert Anderson' },
  // More users for variety
  { id: 12, email: 'james.thomas@example.com', name: 'James Thomas' },
  { id: 15, email: 'william.jackson@example.com', name: 'William Jackson' },
  { id: 20, email: 'charles.lewis@example.com', name: 'Charles Lewis' },
  { id: 27, email: 'mark.wright@example.com', name: 'Mark Wright' },
  { id: 35, email: 'andrew.mitchell@example.com', name: 'Andrew Mitchell' },
];

// User agent strings for realistic device detection
const userAgents = [
  // Desktop - Windows
  { ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36', device: 'Desktop', os: 'Windows' },
  { ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36', device: 'Desktop', os: 'Windows' },
  { ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0', device: 'Desktop', os: 'Windows' },
  { ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Edge/120.0.0.0 Safari/537.36', device: 'Desktop', os: 'Windows' },
  // Desktop - macOS
  { ua: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36', device: 'Desktop', os: 'macOS' },
  { ua: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15', device: 'Desktop', os: 'macOS' },
  // Desktop - Linux
  { ua: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36', device: 'Desktop', os: 'Linux' },
  { ua: 'Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:121.0) Gecko/20100101 Firefox/121.0', device: 'Desktop', os: 'Linux' },
  // Mobile - Android
  { ua: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36', device: 'Mobile', os: 'Android' },
  { ua: 'Mozilla/5.0 (Linux; Android 13; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36', device: 'Mobile', os: 'Android' },
  // Mobile - iOS
  { ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1', device: 'Mobile', os: 'iOS' },
  { ua: 'Mozilla/5.0 (iPad; CPU OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1', device: 'Tablet', os: 'iOS' },
];

// IP and location data
const locations = [
  { ip: '91.196.45.123', country: 'UA', countryName: 'Ukraine', city: 'Kyiv', isp: 'Kyivstar' },
  { ip: '46.219.87.45', country: 'UA', countryName: 'Ukraine', city: 'Kyiv', isp: 'Ukrtelecom' },
  { ip: '178.150.12.89', country: 'UA', countryName: 'Ukraine', city: 'Lviv', isp: 'Lifecell' },
  { ip: '93.170.45.67', country: 'UA', countryName: 'Ukraine', city: 'Odesa', isp: 'Vodafone UA' },
  { ip: '185.233.18.90', country: 'UA', countryName: 'Ukraine', city: 'Dnipro', isp: 'Triolan' },
  { ip: '104.28.89.123', country: 'US', countryName: 'United States', city: 'San Francisco', isp: 'Cloudflare' },
  { ip: '52.94.76.89', country: 'US', countryName: 'United States', city: 'Ashburn', isp: 'Amazon AWS' },
  { ip: '35.190.45.67', country: 'US', countryName: 'United States', city: 'New York', isp: 'Google Cloud' },
  { ip: '185.199.108.45', country: 'DE', countryName: 'Germany', city: 'Frankfurt', isp: 'GitHub' },
  { ip: '151.101.1.140', country: 'GB', countryName: 'United Kingdom', city: 'London', isp: 'Fastly' },
  { ip: '203.0.113.42', country: 'PL', countryName: 'Poland', city: 'Warsaw', isp: 'Orange Polska' },
];

// Login result types
const results = {
  success: 'success',
  wrongPassword: 'wrong_password',
  userNotFound: 'user_not_found',
  accountLocked: 'account_locked',
};

function daysAgo(days: number, hoursOffset: number = 0): Date {
  const date = new Date();
  date.setDate(date.getDate() - days);
  date.setHours(date.getHours() - hoursOffset);
  return date;
}

function randomElement<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateToken(): string {
  return 'jwt_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

export async function seedAuthHistory(prisma: PrismaClient) {
  console.log('  📝 Generating auth history...');

  const historyEntries: any[] = [];

  // Generate login history for last 30 days
  for (let day = 0; day < 30; day++) {
    // More logins on weekdays, fewer on weekends
    const isWeekend = (new Date().getDay() - day + 7) % 7 >= 5;
    const loginsPerDay = isWeekend ? Math.floor(Math.random() * 5) + 2 : Math.floor(Math.random() * 15) + 8;

    for (let i = 0; i < loginsPerDay; i++) {
      const user = randomElement(demoUsers);
      const uaData = randomElement(userAgents);
      const location = randomElement(locations);
      const hourOffset = Math.floor(Math.random() * 24);

      // 85% success rate, 10% wrong password, 5% other failures
      const roll = Math.random();
      let result: string;
      let loginEmail = user.email;

      if (roll < 0.85) {
        result = results.success;
      } else if (roll < 0.95) {
        result = results.wrongPassword;
      } else if (roll < 0.98) {
        result = results.userNotFound;
        loginEmail = `unknown${Math.floor(Math.random() * 100)}@example.com`;
      } else {
        result = results.accountLocked;
      }

      historyEntries.push({
        login: loginEmail,
        email: loginEmail,
        password: '********',
        deviceData: {
          ip: location.ip,
          user_agent: uaData.ua,
          device: uaData.device,
          os: uaData.os,
        },
        ispData: {
          clientIp: location.ip,
          country: location.country,
          countryName: location.countryName,
          city: location.city,
          isp: location.isp,
        },
        result: result,
        userId: result === results.userNotFound ? null : user.id,
        userName: result === results.userNotFound ? null : user.name,
        token: generateToken(),
        attemptTime: daysAgo(day, hourOffset),
        createdAt: daysAgo(day, hourOffset),
        updatedAt: daysAgo(day, hourOffset),
      });
    }
  }

  // Add some brute force attempts (clustered failed logins)
  const bruteForceDay = Math.floor(Math.random() * 20) + 5;
  for (let i = 0; i < 8; i++) {
    historyEntries.push({
      login: 'admin@typus',
      email: 'admin@typus',
      password: '********',
      deviceData: {
        ip: '45.33.32.156',
        user_agent: 'curl/7.88.0',
        device: 'CLI',
        os: 'Linux',
      },
      ispData: {
        clientIp: '45.33.32.156',
        country: 'RU',
        countryName: 'Russia',
        city: 'Moscow',
        isp: 'Suspicious VPN',
      },
      result: results.wrongPassword,
      userId: 1,
      userName: 'Admin',
      token: generateToken(),
      attemptTime: daysAgo(bruteForceDay, i),
      createdAt: daysAgo(bruteForceDay, i),
      updatedAt: daysAgo(bruteForceDay, i),
    });
  }

  // Sort by date descending
  historyEntries.sort((a, b) => b.attemptTime.getTime() - a.attemptTime.getTime());

  // Insert all entries
  await prisma.authHistory.createMany({
    data: historyEntries,
    skipDuplicates: true,
  });

  console.log(`  ✅ Created ${historyEntries.length} auth history entries`);
}
