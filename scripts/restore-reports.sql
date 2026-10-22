-- =========================================================================
-- Fixie Report Ownership Restoration Script
-- Disconnects all reports from Maria Ortiz and restores original reporters
-- =========================================================================

-- 1. Restore canonical reports table student_id to original student UUIDs
UPDATE reports SET student_id = 'e101ced6-cc94-4d17-83e7-c519782f7dba' WHERE report_id = 'LR-01'; -- Chryztel Geene Salvador (24-2026-107)
UPDATE reports SET student_id = 'c52fa8d2-b505-4249-b012-060e313fe18e' WHERE report_id = 'LR-02'; -- Bianca Allyzon Antonio (24-2026-106)
UPDATE reports SET student_id = 'd0a857f1-87a1-49a4-b0c7-5c3d61e78ecd' WHERE report_id = 'LR-03'; -- Emmanuel Gaspar (24-0132-062)
UPDATE reports SET student_id = 'd907e0ff-fe9c-4d19-aac5-f826e311b5ef' WHERE report_id = 'LR-04'; -- Jazmin Bayudan (24-2745-132)
UPDATE reports SET student_id = 'c16771bd-67f2-4bb2-9191-0e2dcb69a511' WHERE report_id = 'LR-05'; -- Jeane Kelly Mina (24-1003-101)
UPDATE reports SET student_id = '81ccc938-0114-4894-8034-50b71a7aca74' WHERE report_id = 'LR-06'; -- Alyssa Ramos (22-0941-301)
UPDATE reports SET student_id = '21877a55-8600-4a5d-88ce-4e0746c23898' WHERE report_id = 'LR-07'; -- Maria Reyes (24-8521-063)
UPDATE reports SET student_id = '82f230ea-abdb-4bc2-8fea-e87eb897299c' WHERE report_id = 'LR-08'; -- Juan Dela Cruz (24-0031-267)
UPDATE reports SET student_id = 'a9974b97-4eb0-4876-8a62-cdc86023bbd4' WHERE report_id = 'LR-09'; -- Reyn Arahan (24-7345-853)
UPDATE reports SET student_id = '51664213-275b-4e67-9024-d92d7e0a8022' WHERE report_id = 'LR-10'; -- Jennelyn Vergara (24-2026-340)
UPDATE reports SET student_id = '9002d8e6-bc03-4070-8aae-299147dead9a' WHERE report_id = 'LR-11'; -- Angel Lae Martinez (24-0041-147)
UPDATE reports SET student_id = '81ccc938-0114-4894-8034-50b71a7aca74' WHERE report_id = 'LR-12'; -- Alyssa Ramos (22-0941-301)
UPDATE reports SET student_id = '309bd498-9f2f-4753-a6ad-e27642a377b7' WHERE report_id = 'LR-13'; -- Justine Kate Abello (24-2026-109)
UPDATE reports SET student_id = 'bbb5f955-b361-4929-8055-031d61dd4f58' WHERE report_id = 'LR-14'; -- John Lester Tan (24-2026-108)
UPDATE reports SET student_id = 'e101ced6-cc94-4d17-83e7-c519782f7dba' WHERE report_id = 'LR-15'; -- Chryztel Geene Salvador (24-2026-107)
UPDATE reports SET student_id = 'c52fa8d2-b505-4249-b012-060e313fe18e' WHERE report_id = 'LR-16'; -- Bianca Allyzon Antonio (24-2026-106)
UPDATE reports SET student_id = 'd0a857f1-87a1-49a4-b0c7-5c3d61e78ecd' WHERE report_id = 'LR-17'; -- Emmanuel Gaspar (24-0132-062)
UPDATE reports SET student_id = '43516fd4-6370-409e-96c0-5acc8d56d9c6' WHERE report_id = 'LR-18'; -- Phia Cayetano (24-4011-088)
UPDATE reports SET student_id = '43516fd4-6370-409e-96c0-5acc8d56d9c6' WHERE report_id = 'LR-19'; -- Phia Cayetano (24-4011-088)
UPDATE reports SET student_id = '21877a55-8600-4a5d-88ce-4e0746c23898' WHERE report_id = 'LR-20'; -- Maria Reyes (24-8521-063)
UPDATE reports SET student_id = '82f230ea-abdb-4bc2-8fea-e87eb897299c' WHERE report_id = 'LR-21'; -- Juan Dela Cruz (24-0031-267)
UPDATE reports SET student_id = 'a9974b97-4eb0-4876-8a62-cdc86023bbd4' WHERE report_id = 'LR-22'; -- Reyn Arahan (24-7345-853)
UPDATE reports SET student_id = '51664213-275b-4e67-9024-d92d7e0a8022' WHERE report_id = 'LR-23'; -- Jennelyn Vergara (24-2026-340)
UPDATE reports SET student_id = '9002d8e6-bc03-4070-8aae-299147dead9a' WHERE report_id = 'LR-24'; -- Angel Lae Martinez (24-0041-147)

-- 2. Restore reports_of_student table to Angel Lae Martinez (24-0041-147) for LR-01 to LR-18
UPDATE reports_of_student 
SET student_id = '24-0041-147', 
    student_name = 'Angel Lae Martinez', 
    year_block = 'BSIT 3-2'
WHERE report_id IN ('LR-01', 'LR-02', 'LR-03', 'LR-04', 'LR-05', 'LR-06', 'LR-07', 'LR-08', 'LR-09', 'LR-10', 'LR-11', 'LR-12', 'LR-13', 'LR-14', 'LR-15', 'LR-16', 'LR-17', 'LR-18');

-- 3. Delete mistakenly inserted extra rows for Maria Ortiz in reports_of_student
DELETE FROM reports_of_student 
WHERE student_id = '24-0872-090' 
  AND report_id IN ('LR-19', 'LR-20', 'LR-21', 'LR-22', 'LR-23', 'LR-24');
