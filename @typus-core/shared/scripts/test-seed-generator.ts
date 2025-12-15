#!/usr/bin/env node

/**
 * Test SeedGenerator
 * Demonstrates seed generation from DSL models
 */

import { SeedGenerator } from '../dsl/generators/SeedGenerator.js';
import { DslModel } from '../dsl/types.js';

// Example model
const testModel: DslModel = {
  name: 'TestItem',
  module: 'test_instant',
  tableName: 'test_items',
  generatePrisma: true,
  fields: [
    {
      name: 'id',
      type: 'Int',
      required: true,
      unique: true,
      primaryKey: true,
      autoIncrement: true
    },
    {
      name: 'title',
      type: 'string',
      required: true
    },
    {
      name: 'description',
      type: 'text',
      required: false
    },
    {
      name: 'count',
      type: 'Int',
      required: false,
      default: 0
    },
    {
      name: 'isActive',
      type: 'boolean',
      required: true,
      default: true
    },
    {
      name: 'userId',
      type: 'Int',
      required: true
    },
    {
      name: 'metadata',
      type: 'json',
      required: false
    },
    {
      name: 'createdAt',
      type: 'datetime'
    },
    {
      name: 'updatedAt',
      type: 'datetime'
    }
  ],
  config: {
    timestamps: true
  }
};

console.log('🧪 Testing SeedGenerator\n');

const generator = new SeedGenerator();

console.log('📝 Generating seed for TestItem model...\n');
const seed = generator.generateSeed(testModel, 3);

console.log(seed);

console.log('\n✅ Seed generation complete!');
