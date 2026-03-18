# app/schemas/transaction.py
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field


class TransactionBase(BaseModel):
    amount:        float
    date:          str
    name:          str
    category:      str = "Uncategorized"
    type:          str = "expense"
    source:        str = "manual"
    account_id:    Optional[str] = None
    note:          Optional[str] = None
    currency_code: str = "INR"


class TransactionCreate(TransactionBase):
    pass


class TransactionUpdate(BaseModel):
    amount:        Optional[float] = None
    date:          Optional[str] = None
    name:          Optional[str] = None
    category:      Optional[str] = None
    type:          Optional[str] = None
    account_id:    Optional[str] = None
    note:          Optional[str] = None


class TransactionResponse(TransactionBase):
    id:            str
    is_anomaly:    bool
    anomaly_score: Optional[float]


class TransactionListResponse(BaseModel):
    transactions: list[TransactionResponse]
    total:        int
    page:         int
    limit:        int
    total_pages:  int


class TransactionFilters(BaseModel):
    page:           int   = 1
    limit:          int   = 20
    date_from:      Optional[str]   = None
    date_to:        Optional[str]   = None
    category:       Optional[str]   = None
    search:         Optional[str]   = None
    anomalies_only: bool            = False
    account_id:     Optional[str]   = None
    min_amount:     Optional[float] = None
    max_amount:     Optional[float] = None


class SpendingSummary(BaseModel):
    total_expenses: float
    total_income:   float
    by_category:    dict[str, float]
    by_month:       dict[str, dict]
    anomaly_count:  int
    date_from:      Optional[str]
    date_to:        Optional[str]


# CSV Import Schemas
class CsvColumnMapping(BaseModel):
    amount_col:   str
    date_col:     str
    name_col:     str
    type_col:     Optional[str] = None
    category_col: Optional[str] = None


class CsvImportPreviewRequest(BaseModel):
    # Depending on how we upload, could just be a dict mapping. 
    pass


class CsvImportCommitRequest(BaseModel):
    mapping: CsvColumnMapping
    rows:    List[Dict[str, Any]] # Raw rows approved by the user


class CsvImportPreviewResponse(BaseModel):
    headers:          List[str]
    sample_rows:      List[Dict[str, Any]]
    suggested_mapping: CsvColumnMapping


class CsvUploadResponse(BaseModel):
    message:        str
    rows_processed: int
    rows_imported:  int
    rows_skipped:   int
    errors:         list[str] = []