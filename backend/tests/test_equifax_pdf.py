import pytest
import unittest.mock as mock
from app.parser import CreditReportParser

EQUIFAX_PDF_SAMPLE_TEXT = """
Prepared for:
CARLOS A PIERLUISSIS-PINTO
Date: July 24, 2026
Confirmation # 6205596219

Credit Accounts

 JPMCB AUTO FINANCE
700 KANSAS LANE, MONROE, LA 71203 | (800) 336-6675 Date Reported: 07/20/2026 | Balance: $48,532
Account Number: *3407 | Owner: Joint Account Credit Limit: | High Credit: $50,224
Loan/Account Type: Auto | Status: Pays As Agreed

 CFNA/BRIDGESTONE RETAIL
6275 EASTLAND ROAD, BROOK PARK, OH 44142 | (800) 321-3950 Date Reported: 07/20/2026 | Balance: $444
Account Number: *6450 | Owner: Individual Account Credit Limit: $2,000 | High Credit: $1,214
Loan/Account Type: Charge Account | Status: Pays As Agreed

 JPMCB CARD SERVICES
PO BOX 15369, WILMINGTON, DE 19850 | (800) 945-2000 Date Reported: 07/17/2026 | Balance: $2,331
Account Number: *7929 | Owner: Individual Account Credit Limit: $14,300 | High Credit: $9,098
Loan/Account Type: Credit Card | Status: Pays As Agreed

 SYNCB/SAM S CLUB DC
PO Box 71727, Philadelphia, PA 19176 | (866) 396-8254 Date Reported: 07/16/2026 | Balance: $0
Account Number: *3943 | Owner: Individual Account Credit Limit: $3,000 | High Credit: $100
Loan/Account Type: Credit Card | Status: Pays As Agreed

 CAPITAL ONE BANK USA NA
PO BOX 31293, Salt Lake City, UT 84131 | (800) 955-7070 Date Reported: 07/13/2026 | Balance: $623
Account Number: *0183 | Owner: Individual Account Credit Limit: $3,250 | High Credit: $1,464
Loan/Account Type: Credit Card | Status: Pays As Agreed

 Bank of America
PO Box 982238, El Paso, TX 79998 | (800) 421-2110 Date Reported: 07/14/2026 | Balance: $2,407
Account Number: *4624 | Owner: Individual Account Credit Limit: $4,500 | High Credit: $2,407
Loan/Account Type: Credit Card | Status: Pays As Agreed

 TOYOTA FINANCIAL SERVICES
Credit Dispute Research Team, Cedar Rapids, IA | (800) 874-8822 Date Reported: 06/30/2026 | Balance: $15,463
Account Number: *0001 | Owner: Individual Account Credit Limit: | High Credit: $43,699
Loan/Account Type: Auto | Status: Pays As Agreed

 SYNCB/AMAZON PLCC
PO Box 71737, Philadelphia, PA 19176 | (866) 396-8254 Date Reported: 07/10/2026 | Balance: $823
Account Number: *4940 | Owner: Individual Account Credit Limit: $2,500 | High Credit: $1,061
Loan/Account Type: Charge Account | Status: Pays As Agreed

 BESTBUY/CBNA
5800 SOUTH CORPORATE PLACE, SIOUX FALLS, SD 57108 | (800) 950-5114 Date Reported: 07/11/2026 | Balance: $1,526
Account Number: *2524 | Owner: Individual Account Credit Limit: $5,050 | High Credit: $2,923
Loan/Account Type: Credit Card | Status: Pays As Agreed

 SYNCB/SAMS CLUB
PO Box 71727, Philadelphia, PA 19176 | (866) 396-8254 Date Reported: 07/10/2026 | Balance: $16
Account Number: *5894 | Owner: Individual Account Credit Limit: $500 | High Credit: $475
Loan/Account Type: Charge Account | Status: Pays As Agreed

 Bank of America
PO Box 982238, El Paso, TX 79998 | (800) 421-2110 Date Reported: 07/09/2026 | Balance: $8,355
Account Number: *5938 | Owner: Individual Account Credit Limit: $8,900 | High Credit: $8,892
Loan/Account Type: Credit Card | Status: Pays As Agreed

 WESTGATE RESORTS
PO BOX 668, OCOEE, FL 34761 | (888) 491-0132 Date Reported: 06/30/2026 | Balance: $11,757
Account Number: *7401 | Owner: Joint Account Credit Limit: | High Credit: $12,586
Loan/Account Type: Real Estate | Status: Pays As Agreed

 PENNYMAC LOAN SERVICES LLC - Closed
PO BOX 514387 M, LOS ANGELES, CA 90051 | (800) 777-4001 Date Reported: 03/06/2026 | Balance: $0
Account Number: *9312 | Owner: Joint Account Credit Limit: | High Credit: $250,331
Loan/Account Type: FHA Real Estate Mortgage | Status: Pays As Agreed

 A&D MORTGAGE LLC
899 W Cypress Creek Rd, Fort Lauderdale, FL 33309 | (305) 760-9090 Date Reported: 03/31/2026 | Balance: $259,274
Account Number: *1181 | Owner: Joint Account Credit Limit: | High Credit: $259,274
Loan/Account Type: Conventional Re Mortgage | Status: Pays As Agreed

 LAUNCH SERVICING, LLC - Closed
5109 BROADBAND LN STE 400, SIOUX FALLS, SD 57108 | (605) 444-4824 Date Reported: 10/03/2024 | Balance: $0
Account Number: *2547 | Owner: Individual Account Credit Limit: | High Credit: $2,496
Loan/Account Type: Education Loan | Status: Pays As Agreed
"""

def test_parse_equifax_pdf_exact():
    page_mock = mock.MagicMock()
    page_mock.extract_text.return_value = EQUIFAX_PDF_SAMPLE_TEXT
    pdf_mock = mock.MagicMock()
    pdf_mock.pages = [page_mock]
    pdf_mock.__enter__.return_value = pdf_mock

    with mock.patch("pdfplumber.open", return_value=pdf_mock):
        res = CreditReportParser.parse_pdf_report(b"fake_pdf")

    assert res["total_tradelines"] == 15
    creditors = [t["creditor_name"] for t in res["tradelines"]]
    assert "JPMCB AUTO FINANCE" in creditors
    assert "TOYOTA FINANCIAL SERVICES" in creditors
    assert "WESTGATE RESORTS" in creditors
    assert "A&D MORTGAGE LLC" in creditors
    assert "CAPITAL ONE BANK USA NA" in creditors
