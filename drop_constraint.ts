import 'dotenv/config';
import { getPool } from './server/db';

async function run() {
  try {
    const pool = await getPool();
    console.log('Connected to DB...');
    
    // Check if constraint exists before dropping
    const checkQuery = `
      SELECT name FROM sys.objects 
      WHERE name = 'UQ_documents_doc_number' AND type = 'UQ'
    `;
    const result = await pool.request().query(checkQuery);
    
    if (result.recordset.length > 0) {
      console.log('Constraint found, dropping...');
      await pool.request().query('ALTER TABLE documents DROP CONSTRAINT UQ_documents_doc_number');
      console.log('Constraint droppedSuccessfully.');
    } else {
      console.log('Constraint UQ_documents_doc_number not found. Checking for indexes...');
      const checkIdx = "SELECT name FROM sys.indexes WHERE object_id = OBJECT_ID('documents') AND name = 'UQ_documents_doc_number'";
      const idxResult = await pool.request().query(checkIdx);
      if (idxResult.recordset.length > 0) {
          console.log('Index UQ_documents_doc_number found, dropping...');
          await pool.request().query('DROP INDEX UQ_documents_doc_number ON documents');
          console.log('Index dropped successfully.');
      } else {
           console.log('No UQ_documents_doc_number constraint or index found.');
      }
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

run();
