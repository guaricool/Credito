from datetime import datetime, date
import io
import re
from typing import Dict, Any, List, Optional
from bs4 import BeautifulSoup
import pdfplumber

KNOWN_CREDITORS = [
    "CHASE", "JPMORGAN CHASE", "CAPITAL ONE", "CITIBANK", "CITI", "DISCOVER", "BANK OF AMERICA", "BOFA",
    "WELLS FARGO", "AMERICAN EXPRESS", "AMEX", "BARCLAYS", "BARCLAYCARD", "SYNCHRONY", "SYNCHRONY BANK",
    "USAA", "TD BANK", "CREDIT ONE", "CREDIT ONE BANK", "NAVY FEDERAL", "NAVY FEDERAL CU", "FIFTH THIRD",
    "PNC", "PNC BANK", "U.S. BANK", "US BANK", "TRUIST", "HUNTINGTON", "KEYBANK", "CITIZENS BANK",
    "MIDLAND CREDIT", "MIDLAND FUNDING", "PORTFOLIO RECOVERY", "PRA RECEIVABLES", "LVNV FUNDING",
    "RESURGENT", "CAVALRY", "CAVALRY SPV", "JEFFERSON CAPITAL", "DEBT RECOVERY", "CONVERGENT",
    "NAVient", "NELNET", "GREAT LAKES", "MOHELA", "AIDVANTAGE", "FIRST PREMIER", "FIRST PREMIER BANK",
    "DESTINY", "BEST BUY", "HOME DEPOT", "TARGET", "KOHLS", "MACYS", "SEARS", "WALMART",
    "CARMAX", "TOYOTA FINANCIAL", "HONDA FINANCIAL", "FORD MOTOR CREDIT", "NISSAN ACCEPTANCE",
    "UPSTART", "SOFI", "MARCUS", "LENDINGCLUB", "AVANT", "ONEMAIN", "ONEMAIN FINANCIAL",
    "WEBBANK", "CELTIC BANK", "DESERVE", "PROSPER", "OPPORTUNITY FINANCIAL", "OPPFI"
]

class CreditReportParser:
    @staticmethod
    def _parse_date(date_str: Optional[str]) -> Optional[str]:
        if not date_str or not isinstance(date_str, str):
            return None
        date_str = date_str.strip()
        if not date_str or date_str.lower() in ("n/a", "none", "--", "-", "null", "unknown"):
            return None
        for fmt in ("%Y-%m-%d", "%m/%d/%Y", "%m-%d-%Y", "%B %d, %Y", "%b %d, %Y", "%Y/%m/%d", "%m/%Y"):
            try:
                dt = datetime.strptime(date_str, fmt)
                return dt.strftime("%Y-%m-%d")
            except ValueError:
                continue
        return None

    @staticmethod
    def _parse_amount(amount_str: Optional[Any]) -> float:
        if amount_str is None:
            return 0.0
        if isinstance(amount_str, (int, float)):
            return float(amount_str)
        s = str(amount_str).strip().replace("$", "").replace(",", "")
        try:
            return float(s)
        except ValueError:
            return 0.0

    @staticmethod
    def extract_scores(text: str) -> Dict[str, Optional[int]]:
        """
        Extracts credit scores for Experian, Equifax, TransUnion or general score from text.
        """
        scores: Dict[str, Optional[int]] = {
            "score_experian": None,
            "score_equifax": None,
            "score_transunion": None,
            "credit_score": None
        }
        
        exp_m = re.search(r"Experian(?:\s+FICO|\s+VantageScore|\s+Score)?[:\s]+(\d{3})", text, re.I)
        if exp_m:
            score_val = int(exp_m.group(1))
            if 300 <= score_val <= 850:
                scores["score_experian"] = score_val

        eq_m = re.search(r"Equifax(?:\s+FICO|\s+VantageScore|\s+Score)?[:\s]+(\d{3})", text, re.I)
        if eq_m:
            score_val = int(eq_m.group(1))
            if 300 <= score_val <= 850:
                scores["score_equifax"] = score_val

        tu_m = re.search(r"TransUnion(?:\s+FICO|\s+VantageScore|\s+Score)?[:\s]+(\d{3})", text, re.I)
        if tu_m:
            score_val = int(tu_m.group(1))
            if 300 <= score_val <= 850:
                scores["score_transunion"] = score_val

        gen_m = re.search(r"(?:FICO|VantageScore|Credit\s+Score)[:\s]+(\d{3})", text, re.I)
        if gen_m:
            score_val = int(gen_m.group(1))
            if 300 <= score_val <= 850:
                scores["credit_score"] = score_val

        return scores

    @staticmethod
    def parse_html_report(html_content: str) -> Dict[str, Any]:
        """
        Parses HTML credit monitoring reports (SmartCredit, IdentityIQ, tri-bureau HTML).
        """
        soup = BeautifulSoup(html_content, "html.parser")
        tradelines: List[Dict[str, Any]] = []
        text_content = soup.get_text()

        scores = CreditReportParser.extract_scores(text_content)

        account_blocks = soup.find_all(class_=re.compile(r"(tradeline|account-item|account-card|credit-account)", re.I))

        if not account_blocks:
            tables = soup.find_all("table")
            for table in tables:
                table_text = table.get_text()
                if any(kw in table_text for kw in ["Experian", "Equifax", "TransUnion", "Account Number", "Creditor", "Balance", "Account Name"]):
                    rows = table.find_all("tr")
                    creditor_name = None
                    account_number = None
                    account_type = None
                    date_opened = None
                    bureaus: Dict[str, Dict[str, Any]] = {
                        "Experian": {},
                        "Equifax": {},
                        "TransUnion": {}
                    }

                    for row in rows:
                        cells = [cell.get_text(strip=True) for cell in row.find_all(["td", "th"])]
                        if not cells:
                            continue
                        
                        label = cells[0].lower()
                        if any(k in label for k in ["creditor", "account name", "lender"]):
                            creditor_name = cells[1] if len(cells) > 1 else cells[0]
                        elif any(k in label for k in ["account #", "account number", "account no"]):
                            account_number = cells[1] if len(cells) > 1 else None
                        elif "account type" in label:
                            account_type = cells[1] if len(cells) > 1 else None
                        elif "date opened" in label:
                            date_opened = cells[1] if len(cells) > 1 else None
                        elif "balance" in label:
                            if len(cells) >= 4:
                                bureaus["Experian"]["current_balance"] = CreditReportParser._parse_amount(cells[1])
                                bureaus["Equifax"]["current_balance"] = CreditReportParser._parse_amount(cells[2])
                                bureaus["TransUnion"]["current_balance"] = CreditReportParser._parse_amount(cells[3])
                            elif len(cells) >= 2:
                                bureaus["Experian"]["current_balance"] = CreditReportParser._parse_amount(cells[1])
                        elif "past due" in label:
                            if len(cells) >= 4:
                                bureaus["Experian"]["past_due_amount"] = CreditReportParser._parse_amount(cells[1])
                                bureaus["Equifax"]["past_due_amount"] = CreditReportParser._parse_amount(cells[2])
                                bureaus["TransUnion"]["past_due_amount"] = CreditReportParser._parse_amount(cells[3])
                            elif len(cells) >= 2:
                                bureaus["Experian"]["past_due_amount"] = CreditReportParser._parse_amount(cells[1])
                        elif any(k in label for k in ["status", "account status"]):
                            if len(cells) >= 4:
                                bureaus["Experian"]["account_status"] = cells[1]
                                bureaus["Equifax"]["account_status"] = cells[2]
                                bureaus["TransUnion"]["account_status"] = cells[3]
                            elif len(cells) >= 2:
                                bureaus["Experian"]["account_status"] = cells[1]
                        elif any(k in label for k in ["dofd", "first delinquency", "date of first delinquency"]):
                            if len(cells) >= 4:
                                bureaus["Experian"]["date_of_first_delinquency"] = CreditReportParser._parse_date(cells[1])
                                bureaus["Equifax"]["date_of_first_delinquency"] = CreditReportParser._parse_date(cells[2])
                                bureaus["TransUnion"]["date_of_first_delinquency"] = CreditReportParser._parse_date(cells[3])
                            elif len(cells) >= 2:
                                bureaus["Experian"]["date_of_first_delinquency"] = CreditReportParser._parse_date(cells[1])

                    if creditor_name or any(b.get("account_status") or b.get("current_balance") for b in bureaus.values()):
                        tradelines.append({
                            "creditor_name": creditor_name or "Unknown Creditor",
                            "account_number_masked": account_number or "****",
                            "account_type": account_type or "Revolving",
                            "date_opened": CreditReportParser._parse_date(date_opened),
                            "bureaus": bureaus
                        })

        else:
            for block in account_blocks:
                creditor_el = block.find(class_=re.compile(r"creditor|name|title", re.I))
                creditor_name = creditor_el.get_text(strip=True) if creditor_el else "Unknown Creditor"
                
                acct_el = block.find(class_=re.compile(r"account-number|acct-num", re.I))
                account_number = acct_el.get_text(strip=True) if acct_el else "****"

                type_el = block.find(class_=re.compile(r"account-type|type", re.I))
                account_type = type_el.get_text(strip=True) if type_el else "Revolving"

                opened_el = block.find(class_=re.compile(r"date-opened|opened", re.I))
                date_opened = CreditReportParser._parse_date(opened_el.get_text(strip=True)) if opened_el else None

                bureaus: Dict[str, Dict[str, Any]] = {
                    "Experian": {},
                    "Equifax": {},
                    "TransUnion": {}
                }

                for b in ["Experian", "Equifax", "TransUnion"]:
                    b_el = block.find(class_=re.compile(rf"{b}", re.I)) or block
                    st_el = b_el.find(class_=re.compile(r"status", re.I))
                    bal_el = b_el.find(class_=re.compile(r"balance", re.I))
                    dofd_el = b_el.find(class_=re.compile(r"dofd|delinquency", re.I))

                    bureaus[b] = {
                        "account_status": st_el.get_text(strip=True) if st_el else "Open",
                        "current_balance": CreditReportParser._parse_amount(bal_el.get_text(strip=True)) if bal_el else 0.0,
                        "past_due_amount": 0.0,
                        "date_of_first_delinquency": CreditReportParser._parse_date(dofd_el.get_text(strip=True)) if dofd_el else None,
                        "date_last_reported": None,
                        "payment_history_24_months": None,
                        "comments": None
                    }

                tradelines.append({
                    "creditor_name": creditor_name,
                    "account_number_masked": account_number,
                    "account_type": account_type,
                    "date_opened": date_opened,
                    "bureaus": bureaus
                })

        source_provider = "HTML Report"
        if "smartcredit" in html_content.lower():
            source_provider = "SmartCredit"
        elif "identityiq" in html_content.lower():
            source_provider = "IdentityIQ"
        elif "experian" in html_content.lower():
            source_provider = "Experian HTML"

        res = {
            "source_provider": source_provider,
            "report_date": date.today().strftime("%Y-%m-%d"),
            "total_tradelines": len(tradelines),
            "tradelines": tradelines
        }
        res.update(scores)
        return res

    @staticmethod
    def parse_pdf_report(pdf_bytes: bytes) -> Dict[str, Any]:
        """
        Extracts text from PDF bytes via pdfplumber and parses real tradelines without fake fallbacks.
        Supports official Equifax, Experian, TransUnion and AnnualCreditReport PDF formats.
        """
        text_content = ""
        try:
            with pdfplumber.open(io.BytesIO(pdf_bytes)) as pdf:
                for page in pdf.pages:
                    page_text = page.extract_text() or ""
                    text_content += page_text + "\n"
        except Exception:
            text_content = ""

        scores = CreditReportParser.extract_scores(text_content)
        tradelines: List[Dict[str, Any]] = []

        # ---------------------------------------------------------------------
        # Strategy 0: Official Equifax & AnnualCreditReport PDF Format
        # Structure in Equifax PDF:
        #   <CREDITOR_NAME>
        #   <ADDRESS_LINE | PHONE> Date Reported: MM/DD/YYYY | Balance: $X,XXX
        #   Account Number: *XXXX | Owner: ... Credit Limit: $X,XXX
        #   Loan/Account Type: Auto | Status: Pays As Agreed
        # ---------------------------------------------------------------------
        equifax_matches = list(re.finditer(r"Date Reported:\s*([\d/]+)\s*\|\s*Balance:\s*\$?([\d,]+)", text_content, re.I))

        if equifax_matches:
            for idx, match in enumerate(equifax_matches):
                start_pos = match.start()
                prev_text = text_content[max(0, start_pos - 400):start_pos]
                lines_above = [l.strip() for l in prev_text.split("\n") if l.strip()]
                
                c_name = "Credit Account"
                if lines_above:
                    for cand in reversed(lines_above):
                        cand_clean = re.sub(r"^[^\w]+", "", cand).strip()
                        # Exclude address lines, phone numbers, page numbers, and system headers
                        is_metadata = any(k in cand_clean.lower() for k in [
                            "po box", "street", "road", "park", "blvd", "lane", " suite", " ave", " drive",
                            "phone:", "|", "(800)", "(888)", "(866)", "(877)", "(844)", "(833)", "(855)", "(305)", "(605)",
                            "page ", "equifax", "credit report", "prepared for", "confirmation",
                            "did you know", "consumer file", "negative information", "inquiries",
                            "date:", "summary", "personal information", "credit accounts", "24 month history",
                            "narrative code", "payment history", "months reviewed", "terms frequency"
                        ]) or re.search(r"\b\d{5}\b", cand_clean)  # ZIP code

                        if not is_metadata and len(cand_clean) > 2 and not cand_clean.isdigit():
                            c_name = cand_clean
                            break

                end_pos = equifax_matches[idx + 1].start() if idx + 1 < len(equifax_matches) else len(text_content)
                block = text_content[start_pos:end_pos]

                balance = CreditReportParser._parse_amount(match.group(2))

                acct_m = re.search(r"Account Number:\s*([*\d\w-]+)", block, re.I)
                acct_num = acct_m.group(1).strip() if acct_m else "****"

                type_m = re.search(r"Loan/Account Type:\s*([^|\n]+)", block, re.I)
                acct_type = type_m.group(1).strip() if type_m else "Account"

                status_m = re.search(r"Status:\s*([^|\n]+)", block, re.I)
                status = status_m.group(1).strip() if status_m else "Pays As Agreed"

                past_due_m = re.search(r"Amount Past Due:\s*\$?([\d,]+)", block, re.I)
                past_due = CreditReportParser._parse_amount(past_due_m.group(1)) if past_due_m else 0.0

                dofd_m = re.search(r"Date of 1st Delinquency:\s*([\d/-]+)", block, re.I)
                dofd = CreditReportParser._parse_date(dofd_m.group(1)) if dofd_m else None

                date_opened_m = re.search(r"Date Opened:\s*([\d/-]+)", block, re.I)
                date_opened = CreditReportParser._parse_date(date_opened_m.group(1)) if date_opened_m else None

                tradelines.append({
                    "creditor_name": c_name,
                    "account_number_masked": acct_num,
                    "account_type": acct_type,
                    "date_opened": date_opened,
                    "bureaus": {
                        "Experian": {"account_status": status, "current_balance": balance, "past_due_amount": past_due, "date_of_first_delinquency": dofd},
                        "Equifax": {"account_status": status, "current_balance": balance, "past_due_amount": past_due, "date_of_first_delinquency": dofd},
                        "TransUnion": {"account_status": status, "current_balance": balance, "past_due_amount": past_due, "date_of_first_delinquency": dofd}
                    }
                })

        # ---------------------------------------------------------------------
        # Strategy A: Match by explicit field headers (Creditor:, Account Name:, Lender:)
        # ---------------------------------------------------------------------
        if not tradelines:
            creditor_matches = list(re.finditer(r"(?:Creditor|Account Name|Lender|Original Creditor|Company Name)[:\s]+([^\n]+)", text_content, re.I))

            if creditor_matches:
                for idx, match in enumerate(creditor_matches):
                    c_name = match.group(1).strip()
                    if len(c_name) > 60 or c_name.lower() in ("experian", "equifax", "transunion", "summary", "report"):
                        continue

                    start_pos = match.start()
                    end_pos = creditor_matches[idx + 1].start() if idx + 1 < len(creditor_matches) else len(text_content)
                    block = text_content[start_pos:end_pos]

                    acct_m = re.search(r"(?:Account\s*#|Account Number|Acct\s*#)[:\s]+([*\w-]+)", block, re.I)
                    acct_num = acct_m.group(1).strip() if acct_m else "****"

                    type_m = re.search(r"(?:Account Type|Type)[:\s]+([^\n]+)", block, re.I)
                    acct_type = type_m.group(1).strip() if type_m else "Revolving"

                    bal_m = re.search(r"(?:Balance|Current Balance|Amount Owed)[:\s]+\$?([\d,]+(?:\.\d{2})?)", block, re.I)
                    balance = CreditReportParser._parse_amount(bal_m.group(1)) if bal_m else 0.0

                    past_due_m = re.search(r"(?:Past Due|Amount Past Due)[:\s]+\$?([\d,]+(?:\.\d{2})?)", block, re.I)
                    past_due = CreditReportParser._parse_amount(past_due_m.group(1)) if past_due_m else 0.0

                    status_m = re.search(r"(?:Status|Account Status)[:\s]+([^\n]+)", block, re.I)
                    status = status_m.group(1).strip() if status_m else "Reported"

                    dofd_m = re.search(r"(?:DOFD|First Delinquency|Date of Delinquency)[:\s]+([\d/-]+)", block, re.I)
                    dofd = CreditReportParser._parse_date(dofd_m.group(1)) if dofd_m else None

                    tradelines.append({
                        "creditor_name": c_name,
                        "account_number_masked": acct_num,
                        "account_type": acct_type,
                        "date_opened": None,
                        "bureaus": {
                            "Experian": {"account_status": status, "current_balance": balance, "past_due_amount": past_due, "date_of_first_delinquency": dofd},
                            "Equifax": {"account_status": status, "current_balance": balance, "past_due_amount": past_due, "date_of_first_delinquency": dofd},
                            "TransUnion": {"account_status": status, "current_balance": balance, "past_due_amount": past_due, "date_of_first_delinquency": dofd}
                        }
                    })

        # ---------------------------------------------------------------------
        # Strategy B: Match by Known Financial Institution Names in PDF Text
        # ---------------------------------------------------------------------
        if not tradelines:
            for creditor in KNOWN_CREDITORS:
                pattern = re.compile(rf"\b({re.escape(creditor)}[A-Za-z0-9\s]*)\b", re.I)
                for match in pattern.finditer(text_content):
                    start_pos = match.start()
                    block = text_content[start_pos:start_pos + 400]
                    c_name = match.group(1).strip()
                    if len(c_name) > 40:
                        c_name = creditor

                    if any(t["creditor_name"].lower() == c_name.lower() for t in tradelines):
                        continue

                    acct_m = re.search(r"(?:#|Account|Acct)?[:\s]*([*\d]{4,16})", block, re.I)
                    acct_num = f"****{acct_m.group(1)[-4:]}" if acct_m else "****"

                    bal_m = re.search(r"\$?([\d,]+\.\d{2})", block)
                    balance = CreditReportParser._parse_amount(bal_m.group(1)) if bal_m else 0.0

                    status_m = re.search(r"(Open|Paid|Derogatory|Collection|Late|Charge-off|Closed|Pays As Agreed)", block, re.I)
                    status = status_m.group(1) if status_m else "Reported"

                    tradelines.append({
                        "creditor_name": c_name,
                        "account_number_masked": acct_num,
                        "account_type": "Revolving" if "card" in c_name.lower() or "bank" in c_name.lower() else "Account",
                        "date_opened": None,
                        "bureaus": {
                            "Experian": {"account_status": status, "current_balance": balance, "past_due_amount": 0.0, "date_of_first_delinquency": None},
                            "Equifax": {"account_status": status, "current_balance": balance, "past_due_amount": 0.0, "date_of_first_delinquency": None},
                            "TransUnion": {"account_status": status, "current_balance": balance, "past_due_amount": 0.0, "date_of_first_delinquency": None}
                        }
                    })

        source_provider = "PDF Report"
        if "equifax" in text_content.lower():
            source_provider = "Equifax PDF"
        elif "experian" in text_content.lower():
            source_provider = "Experian PDF"
        elif "transunion" in text_content.lower():
            source_provider = "TransUnion PDF"

        res = {
            "source_provider": source_provider,
            "report_date": date.today().strftime("%Y-%m-%d"),
            "extracted_length": len(text_content),
            "total_tradelines": len(tradelines),
            "tradelines": tradelines
        }
        res.update(scores)
        return res

    @staticmethod
    def parse_report(file_bytes: bytes, filename: str) -> Dict[str, Any]:
        """
        Dispatches parsing based on file extension (.html/.htm or .pdf).
        Raises ValueError for unsupported formats.
        """
        fname_lower = filename.lower()
        if fname_lower.endswith(".html") or fname_lower.endswith(".htm"):
            try:
                html_content = file_bytes.decode("utf-8")
            except UnicodeDecodeError:
                html_content = file_bytes.decode("latin-1", errors="ignore")
            return CreditReportParser.parse_html_report(html_content)
        elif fname_lower.endswith(".pdf"):
            return CreditReportParser.parse_pdf_report(file_bytes)
        else:
            raise ValueError(f"Unsupported file format: '{filename}'. Only .html, .htm, and .pdf files are supported.")
