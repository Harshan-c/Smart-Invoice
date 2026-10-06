# =========================================================
# LABEL DEFINITIONS
# =========================================================

LABELS = {
    "invoice_number": [
        "invoice no",
        "invoice number",
        "inv no",
        "inv number",
        "bill no",
        "bill number",
        "invoice #",
        "bill #"
    ],

    "invoice_date": [
        "invoice date",
        "inv date",
        "bill date"
    ],

    "order_number": [
        "order no",
        "order number",
        "po no",
        "po number"
    ],

    "order_date": [
        "order date",
        "po date"
    ],

    "payment_mode": [
        "mode of payment",
        "payment mode",
        "payment method"
    ],

    "vendor": [
        "vendor",
        "vendor name",
        "supplier",
        "supplier name",
        "seller",
        "seller name",
        "bill from",
        "billed from",
        "sold by"
    ],

    "gstin": [
        "gstin",
        "gst no",
        "gst number",
        "gst registration"
    ],

    "total": [
        "total invoice",
        "invoice value",
        "grand total",
        "amount payable",
        "total amount",
        "net amount",
        "total payable",
        "amount due"
    ]
}


# =========================================================
# PAYMENT MODES
# =========================================================

PAYMENT_MODES = {
    "cash",
    "credit",
    "card",
    "upi",
    "online",
    "bank transfer",
    "cheque",
    "net banking"
}


# =========================================================
# GST STATE CODES
# =========================================================

# GST state code (first two digits of a GSTIN)
# -> state / UT name

GST_STATE_CODES = {
    "01": "Jammu and Kashmir",
    "02": "Himachal Pradesh",
    "03": "Punjab",
    "04": "Chandigarh",
    "05": "Uttarakhand",
    "06": "Haryana",
    "07": "Delhi",
    "08": "Rajasthan",
    "09": "Uttar Pradesh",
    "10": "Bihar",
    "11": "Sikkim",
    "12": "Arunachal Pradesh",
    "13": "Nagaland",
    "14": "Manipur",
    "15": "Mizoram",
    "16": "Tripura",
    "17": "Meghalaya",
    "18": "Assam",
    "19": "West Bengal",
    "20": "Jharkhand",
    "21": "Odisha",
    "22": "Chhattisgarh",
    "23": "Madhya Pradesh",
    "24": "Gujarat",
    "26": "Dadra and Nagar Haveli and Daman and Diu",
    "27": "Maharashtra",
    "29": "Karnataka",
    "30": "Goa",
    "31": "Lakshadweep",
    "32": "Kerala",
    "33": "Tamil Nadu",
    "34": "Puducherry",
    "35": "Andaman and Nicobar Islands",
    "36": "Telangana",
    "37": "Andhra Pradesh",
    "38": "Ladakh"
}

REJECTED_VENDOR_TEXT = {
    "tax invoice",
    "invoice",
    "invoice no",
    "invoice date",
    "order no",
    "order date",
    "mode of payment",
    "gstin",
    "customer bill to",
    "customer ship to",
    "cust name",
    "cust code",
    "saleman",
    "original for recipient",
    "duplicate for transporter",
    "triplicate for supplier",
    "e-invoice"
}


COMPANY_WORDS = {
    "pvt", "private", "ltd", "limited", "llp", "inc", "corp",
    "corporation", "co", "company", "traders", "trading",
    "enterprises", "enterprise", "industries", "industry",
    "stores", "store", "mart", "solutions", "technologies",
    "technology", "services", "agencies", "agency",
    "associates", "distributors", "distributor", "suppliers",
    "supplies", "exports", "imports", "foods", "pharma",
    "pharmacy", "motors", "electronics", "electricals",
    "hardware", "systems", "labs", "laboratories", "textiles",
    "mills", "works", "brothers", "bros", "sons", "retail",
    "wholesale", "marketing", "ventures", "group", "infra",
    "constructions", "builders", "medicals", "chemicals"
}


NAME_STOP_WORDS = {
    "invoice", "tax", "original", "duplicate", "triplicate",
    "copy", "receipt", "memo", "page", "date", "description",
    "qty", "quantity", "rate", "amount", "total", "hsn", "sac",
    "igst", "cgst", "sgst", "signatory", "terms", "conditions",
    "thank", "bank", "account", "ifsc", "declaration",
    "subject", "jurisdiction", "customer", "buyer", "consignee",
    "particulars", "sl", "sr", "unit", "price", "discount",
    "round", "balance", "paid", "payment"
}


ADDRESS_WORDS = {
    "road", "rd", "street", "st", "nagar", "floor", "flr",
    "near", "plot", "sector", "pin", "pincode", "district",
    "dist", "opp", "opposite", "behind", "lane", "colony",
    "main", "cross", "block", "phase", "layout", "avenue",
    "bazaar", "highway", "taluk", "nr", "bldg", "building",
    "complex", "village", "india", "no"
}


CUSTOMER_LABELS = (
    "bill to",
    "billed to",
    "ship to",
    "shipped to",
    "customer",
    "customer name",
    "cust name",
    "buyer",
    "consignee",
    "sold to",
    "deliver to",
    "delivery address",
    "customer bill to",
    "customer ship to"
)


ADDRESS_STOP_WORDS = {
    "tax", "invoice", "gstin", "gst", "phone", "ph", "tel",
    "mobile", "mob", "email", "e-mail", "pan", "order",
    "customer", "cust", "bill", "ship", "date", "cin", "state"
}