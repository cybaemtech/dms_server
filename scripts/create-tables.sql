-- DMS (Document Management System) - SQL Server Table Creation Script
-- Run this script on your SQL Server to create the DMS database and tables

-- Create database if not exists
IF NOT EXISTS (SELECT name FROM sys.databases WHERE name = 'DMS')
BEGIN
    CREATE DATABASE DMS;
END
GO

USE DMS;
GO

-- =============================================
-- Table: departments
-- =============================================
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='departments' AND xtype='U')
BEGIN
    CREATE TABLE departments (
        id NVARCHAR(100) PRIMARY KEY DEFAULT NEWID(),
        name NVARCHAR(255) NOT NULL,
        code NVARCHAR(50) NOT NULL,
        category NVARCHAR(100) NULL,
        category_name NVARCHAR(255) NULL,
        created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
        CONSTRAINT UQ_departments_name UNIQUE (name),
        CONSTRAINT UQ_departments_code UNIQUE (code)
    );
    PRINT 'Created table: departments';
END
GO

-- Add category columns if table already exists but columns are missing
IF EXISTS (SELECT * FROM sysobjects WHERE name='departments' AND xtype='U')
   AND NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('departments') AND name = 'category')
BEGIN
    ALTER TABLE departments ADD category NVARCHAR(100) NULL;
    ALTER TABLE departments ADD category_name NVARCHAR(255) NULL;
    PRINT 'Added category columns to departments table';
END
GO

-- =============================================
-- Table: users
-- =============================================
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='users' AND xtype='U')
BEGIN
    CREATE TABLE users (
        id NVARCHAR(100) PRIMARY KEY DEFAULT NEWID(),
        username NVARCHAR(255) NOT NULL,
        password NVARCHAR(255) NOT NULL,
        role NVARCHAR(50) NOT NULL DEFAULT 'creator',
        full_name NVARCHAR(255) NOT NULL,
        master_copy_access BIT NOT NULL DEFAULT 0,
        department_id NVARCHAR(100) NULL,
        department_name NVARCHAR(255) NULL,
        department_code NVARCHAR(50) NULL,
        location NVARCHAR(255) NULL,
        CONSTRAINT UQ_users_username UNIQUE (username),
        CONSTRAINT FK_users_department FOREIGN KEY (department_id) REFERENCES departments(id)
    );
    PRINT 'Created table: users';
END
GO

-- =============================================
-- Table: documents
-- =============================================
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='documents' AND xtype='U')
BEGIN
    CREATE TABLE documents (
        id NVARCHAR(100) PRIMARY KEY DEFAULT NEWID(),
        doc_name NVARCHAR(500) NOT NULL,
        doc_number NVARCHAR(100) NOT NULL,
        status NVARCHAR(50) NOT NULL DEFAULT 'pending',
        date_of_issue DATETIME2 DEFAULT GETDATE(),
        revision_no INT NOT NULL DEFAULT 0,
        prepared_by NVARCHAR(100) NOT NULL,
        approved_by NVARCHAR(100) NULL,
        issued_by NVARCHAR(100) NULL,
        content NVARCHAR(MAX) NULL,
        header_info NVARCHAR(MAX) NULL,
        footer_info NVARCHAR(MAX) NULL,
        due_period_years INT NULL,
        reason_for_revision NVARCHAR(MAX) NULL,
        review_due_date DATETIME2 NULL,
        created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
        updated_at DATETIME2 NOT NULL DEFAULT GETDATE(),
        approved_at DATETIME2 NULL,
        issued_at DATETIME2 NULL,
        approval_remarks NVARCHAR(MAX) NULL,
        decline_remarks NVARCHAR(MAX) NULL,
        issue_remarks NVARCHAR(MAX) NULL,
        issuer_name NVARCHAR(255) NULL,
        previous_version_id NVARCHAR(100) NULL,
        pdf_file_path NVARCHAR(500) NULL,
        word_file_path NVARCHAR(500) NULL,
        creator_data NVARCHAR(MAX) NULL,
        approver_data NVARCHAR(MAX) NULL,
        issuer_data NVARCHAR(MAX) NULL,
        issue_no NVARCHAR(50) NULL,
        original_date_of_issue DATETIME2 NULL,
        preparer_name NVARCHAR(255) NULL,
        approver_name NVARCHAR(255) NULL,
        page_count INT NULL,
        location NVARCHAR(255) NULL,
        date_of_rev DATETIME2 NULL,
        CONSTRAINT FK_documents_prepared_by FOREIGN KEY (prepared_by) REFERENCES users(id),
        CONSTRAINT FK_documents_approved_by FOREIGN KEY (approved_by) REFERENCES users(id),
        CONSTRAINT FK_documents_issued_by FOREIGN KEY (issued_by) REFERENCES users(id),
        CONSTRAINT FK_documents_previous_version FOREIGN KEY (previous_version_id) REFERENCES documents(id)
    );
    PRINT 'Created table: documents';
END
GO

-- Add non-unique index on doc_number for revision lookups
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_documents_doc_number')
BEGIN
    CREATE NONCLUSTERED INDEX IX_documents_doc_number ON documents(doc_number);
    PRINT 'Created index: IX_documents_doc_number';
END
GO

-- =============================================
-- Table: document_departments
-- =============================================
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='document_departments' AND xtype='U')
BEGIN
    CREATE TABLE document_departments (
        id NVARCHAR(100) PRIMARY KEY DEFAULT NEWID(),
        document_id NVARCHAR(100) NOT NULL,
        department_id NVARCHAR(100) NOT NULL,
        created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
        CONSTRAINT FK_doc_dept_document FOREIGN KEY (document_id) REFERENCES documents(id),
        CONSTRAINT FK_doc_dept_department FOREIGN KEY (department_id) REFERENCES departments(id)
    );
    PRINT 'Created table: document_departments';
END
GO

-- =============================================
-- Table: notifications
-- =============================================
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='notifications' AND xtype='U')
BEGIN
    CREATE TABLE notifications (
        id NVARCHAR(100) PRIMARY KEY DEFAULT NEWID(),
        user_id NVARCHAR(100) NOT NULL,
        document_id NVARCHAR(100) NOT NULL,
        message NVARCHAR(MAX) NOT NULL,
        type NVARCHAR(50) NOT NULL,
        is_read BIT NOT NULL DEFAULT 0,
        created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
        CONSTRAINT FK_notifications_user FOREIGN KEY (user_id) REFERENCES users(id),
        CONSTRAINT FK_notifications_document FOREIGN KEY (document_id) REFERENCES documents(id)
    );
    PRINT 'Created table: notifications';
END
GO

-- =============================================
-- Table: control_copies
-- =============================================
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='control_copies' AND xtype='U')
BEGIN
    CREATE TABLE control_copies (
        id NVARCHAR(100) PRIMARY KEY DEFAULT NEWID(),
        document_id NVARCHAR(100) NOT NULL,
        user_id NVARCHAR(100) NOT NULL,
        copy_number INT NOT NULL,
        action_type NVARCHAR(50) NOT NULL,
        generated_at DATETIME2 NOT NULL DEFAULT GETDATE(),
        CONSTRAINT FK_control_copies_document FOREIGN KEY (document_id) REFERENCES documents(id),
        CONSTRAINT FK_control_copies_user FOREIGN KEY (user_id) REFERENCES users(id)
    );
    PRINT 'Created table: control_copies';
END
GO

-- =============================================
-- Table: print_logs
-- =============================================
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='print_logs' AND xtype='U')
BEGIN
    CREATE TABLE print_logs (
        id NVARCHAR(100) PRIMARY KEY DEFAULT NEWID(),
        document_id NVARCHAR(100) NOT NULL,
        user_id NVARCHAR(100) NOT NULL,
        control_copy_id NVARCHAR(100) NOT NULL,
        printed_at DATETIME2 NOT NULL DEFAULT GETDATE(),
        medium NVARCHAR(100) NULL,
        CONSTRAINT FK_print_logs_document FOREIGN KEY (document_id) REFERENCES documents(id),
        CONSTRAINT FK_print_logs_user FOREIGN KEY (user_id) REFERENCES users(id),
        CONSTRAINT FK_print_logs_control_copy FOREIGN KEY (control_copy_id) REFERENCES control_copies(id)
    );
    PRINT 'Created table: print_logs';
END
GO

-- =============================================
-- Table: document_recipients
-- =============================================
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='document_recipients' AND xtype='U')
BEGIN
    CREATE TABLE document_recipients (
        id NVARCHAR(100) PRIMARY KEY DEFAULT NEWID(),
        document_id NVARCHAR(100) NOT NULL,
        user_id NVARCHAR(100) NULL,
        department_id NVARCHAR(100) NULL,
        notified_at DATETIME2 NOT NULL DEFAULT GETDATE(),
        read_at DATETIME2 NULL,
        CONSTRAINT FK_doc_recipients_document FOREIGN KEY (document_id) REFERENCES documents(id),
        CONSTRAINT FK_doc_recipients_user FOREIGN KEY (user_id) REFERENCES users(id),
        CONSTRAINT FK_doc_recipients_department FOREIGN KEY (department_id) REFERENCES departments(id)
    );
    PRINT 'Created table: document_recipients';
END
GO

-- =============================================
-- Seed Data: Default Departments
-- =============================================
IF NOT EXISTS (SELECT 1 FROM departments)
BEGIN
    INSERT INTO departments (id, name, code) VALUES ('dept-1', 'Engineering', 'ENG');
    INSERT INTO departments (id, name, code) VALUES ('dept-2', 'Quality Assurance', 'QA');
    INSERT INTO departments (id, name, code) VALUES ('dept-3', 'Operations', 'OPS');
    INSERT INTO departments (id, name, code) VALUES ('dept-4', 'Finance', 'FIN');
    INSERT INTO departments (id, name, code) VALUES ('dept-5', 'Human Resources', 'HR');
    PRINT 'Inserted seed departments';
END
GO

-- =============================================
-- Seed Data: Default Users
-- =============================================
IF NOT EXISTS (SELECT 1 FROM users)
BEGIN
    INSERT INTO users (id, username, password, role, full_name, master_copy_access, department_id)
    VALUES ('creator-1', 'Priyanka.k@cybaemtech.com', '123', 'creator', 'Priyanka K', 0, 'dept-2');

    INSERT INTO users (id, username, password, role, full_name, master_copy_access, department_id)
    VALUES ('approver-1', 'approver@cybaem.com', '123', 'approver', 'John Approver', 0, 'dept-2');

    INSERT INTO users (id, username, password, role, full_name, master_copy_access, department_id)
    VALUES ('issuer-1', 'issuer@cybaem.com', '123', 'issuer', 'Jane Issuer', 1, NULL);

    INSERT INTO users (id, username, password, role, full_name, master_copy_access, department_id)
    VALUES ('admin-1', 'admin@cybaem.com', '123', 'admin', 'Admin User', 1, NULL);

    PRINT 'Inserted seed users';
END
GO

PRINT '';
PRINT '=== DMS Database Setup Complete ===';
PRINT 'Tables created: departments, users, documents, document_departments, notifications, control_copies, print_logs, document_recipients';
PRINT 'Default users: Priyanka.k@cybaemtech.com, approver@cybaem.com, issuer@cybaem.com, admin@cybaem.com (all password: 123)';
GO
