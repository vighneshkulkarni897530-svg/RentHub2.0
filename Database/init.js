const fs = require('fs');
const path = require('path');
const db = require('./db');

console.log('🚀 Initializing RentHub Shop Database...');
db.reset();
console.log('📁 Database file: Database/renthub_data.json');
console.log('✨ Database ready! Demo credentials:');
console.log('   - Email: shop@renthub.com OR Phone: 9876543210');
console.log('   - Password: shop123');
