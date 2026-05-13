-- DMS - Truncate All Tables Except Users
-- This script will remove all data from DMS tables while keeping the users table intact
-- Run this on your SQL Server DMS database

USE DMS;
GO

-- Disable foreign key constraints temporarily
ALTER TABLE document_departments NOCHECK CONSTRAINT ALL;
ALTER TABLE notifications NOCHECK CONSTRAINT ALL;
ALTER TABLE control_copies NOCHECK CONSTRAINT ALL;
ALTER TABLE print_logs NOCHECK CONSTRAINT ALL;
ALTER TABLE document_recipients NOCHECK CONSTRAINT ALL;
ALTER TABLE documents NOCHECK CONSTRAINT ALL;
GO

-- Delete data from tables in dependency order (child tables first)
PRINT 'Deleting from document_recipients...';
DELETE FROM document_recipients;

PRINT 'Deleting from document_departments...';
DELETE FROM document_departments;

PRINT 'Deleting from print_logs...';
DELETE FROM print_logs;

PRINT 'Deleting from control_copies...';
DELETE FROM control_copies;

PRINT 'Deleting from notifications...';
DELETE FROM notifications;

PRINT 'Deleting from documents...';
DELETE FROM documents;

-- Reset identity columns if they exist
IF EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('documents') AND is_identity = 1)
BEGIN
    DBCC CHECKIDENT ('documents', RESEED, 0);
END

-- Truncate departments table (no foreign key dependencies)
PRINT 'Deleting from departments...';
DELETE FROM departments;

-- Re-enable foreign key constraints
ALTER TABLE document_departments WITH CHECK CHECK CONSTRAINT ALL;
ALTER TABLE notifications WITH CHECK CHECK CONSTRAINT ALL;
ALTER TABLE control_copies WITH CHECK CHECK CONSTRAINT ALL;
ALTER TABLE print_logs WITH CHECK CHECK CONSTRAINT ALL;
ALTER TABLE document_recipients WITH CHECK CHECK CONSTRAINT ALL;
ALTER TABLE documents WITH CHECK CHECK CONSTRAINT ALL;
GO

-- Verify truncation
SELECT 'departments' AS table_name, COUNT(*) AS row_count FROM departments
UNION ALL
SELECT 'documents' AS table_name, COUNT(*) AS row_count FROM documents
UNION ALL
SELECT 'document_departments' AS table_name, COUNT(*) AS row_count FROM document_departments
UNION ALL
SELECT 'notifications' AS table_name, COUNT(*) AS row_count FROM notifications
UNION ALL
SELECT 'control_copies' AS table_name, COUNT(*) AS row_count FROM control_copies
UNION ALL
SELECT 'print_logs' AS table_name, COUNT(*) AS row_count FROM print_logs
UNION ALL
SELECT 'document_recipients' AS table_name, COUNT(*) AS row_count FROM document_recipients
UNION ALL
SELECT 'users' AS table_name, COUNT(*) AS row_count FROM users;

PRINT 'Truncation completed. Users table was preserved.';
