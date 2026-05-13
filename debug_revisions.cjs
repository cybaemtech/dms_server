const fs = require('fs');
const path = require('path');

// Debug script to test revision activities endpoint
async function debugRevisions() {
  try {
    // Import the SqlServerStorage
    const { SqlServerStorage } = require('./server/storage.ts');
    const storage = new SqlServerStorage();
    
    console.log('🔍 Debugging revision activities...\n');
    
    // Get documents from all statuses
    console.log('Getting documents by status...');
    const pending = await storage.getDocumentsByStatus("pending");
    const approved = await storage.getDocumentsByStatus("approved");
    const issued = await storage.getDocumentsByStatus("issued");
    const declined = await storage.getDocumentsByStatus("declined");
    
    console.log(`📊 Document counts:
- Pending: ${pending.length}
- Approved: ${approved.length}
- Issued: ${issued.length}
- Declined: ${declined.length}`);
    
    const allDocs = [...pending, ...approved, ...issued, ...declined];
    console.log(`📋 Total documents: ${allDocs.length}`);
    
    // Filter to only revision documents (have previousVersionId)
    const revisionDocs = allDocs.filter((doc) => doc.previousVersionId);
    console.log(`🔄 Documents with revisions: ${revisionDocs.length}`);
    
    if (revisionDocs.length > 0) {
      console.log('\n📝 Revision documents found:');
      for (const doc of revisionDocs) {
        console.log(`- ${doc.docNumber} v${doc.revisionNo} (${doc.status})`);
        console.log(`  Previous: ${doc.previousVersionId}`);
        console.log(`  Reason: ${doc.reasonForRevision || 'No reason provided'}`);
        console.log(`  Created: ${doc.createdAt}`);
        console.log('');
      }
      
      // Test getting full revision activity data for first revision
      const firstRevision = revisionDocs[0];
      console.log(`🔍 Testing full data for: ${firstRevision.docNumber}`);
      
      const preparer = await storage.getUser(firstRevision.preparedBy);
      const approver = firstRevision.approvedBy ? await storage.getUser(firstRevision.approvedBy) : null;
      const issuer = firstRevision.issuedBy ? await storage.getUser(firstRevision.issuedBy) : null;
      const depts = await storage.getDocumentDepartments(firstRevision.id);
      
      console.log(`📝 Full revision data:
- Preparer: ${preparer?.fullName || 'Unknown'}
- Approver: ${approver?.fullName || 'None'}
- Issuer: ${issuer?.fullName || 'None'}
- Departments: ${depts.map(d => d.name).join(', ') || 'None'}
- Reason: ${firstRevision.reasonForRevision || 'Not provided'}`);

      // Test getting previous version
      if (firstRevision.previousVersionId) {
        const prevDoc = await storage.getDocument(firstRevision.previousVersionId);
        if (prevDoc) {
          const prevPreparer = await storage.getUser(prevDoc.preparedBy);
          console.log(`📜 Previous version data:
- Doc Number: ${prevDoc.docNumber}
- Revision: ${prevDoc.revisionNo}
- Status: ${prevDoc.status}
- Preparer: ${prevPreparer?.fullName || 'Unknown'}`);
        } else {
          console.log('❌ Previous version not found!');
        }
      }
    } else {
      console.log('❌ No revision documents found in database');
      
      // Show some sample documents to verify data structure
      if (allDocs.length > 0) {
        console.log('\n📋 Sample documents (first 3):');
        for (const doc of allDocs.slice(0, 3)) {
          console.log(`- ID: ${doc.id}`);
          console.log(`  DocNumber: ${doc.docNumber}`);
          console.log(`  Revision: ${doc.revisionNo}`);
          console.log(`  Status: ${doc.status}`);
          console.log(`  PreviousVersionId: ${doc.previousVersionId || 'null'}`);
          console.log(`  CreatedAt: ${doc.createdAt}`);
          console.log('');
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  }
}

debugRevisions();
