
# Configuration
$Url = "https://enkwnlgjslmtxuysdkfc.supabase.co"
$Key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVua3dubGdqc2xtdHh1eXNka2ZjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkxNzcyMzUsImV4cCI6MjA4NDc1MzIzNX0.h6iTvofQW1eEpcX8Esw_4KEtnY6q3zFcWE0i8w0rDJ8"

$Headers = @{
    "apikey" = $Key
    "Authorization" = "Bearer $Key"
    "Content-Type" = "application/json"
    "Prefer" = "return=representation"
}

# 1. Sign Up/Auth to get Token
$Rand = Get-Random
$Email = "verify_search_$Rand@example.com"
$Pass = "TestPass123!"

Write-Host "Creating Test User ($Email)..."
$AuthBody = @{
    email = $Email
    password = $Pass
} | ConvertTo-Json

try {
    $AuthResponse = Invoke-RestMethod -Uri "$Url/auth/v1/signup" -Method Post -Headers $Headers -Body $AuthBody
    $Token = $AuthResponse.access_token
    
    if (-not $Token) {
        Write-Error "No Token from Signup."
        exit 1
    }
    
    $Headers["Authorization"] = "Bearer $Token"
    
} catch {
    Write-Error "Auth Failed: $_"
    exit 1
}

# Dependencies
$MuniResponse = Invoke-RestMethod -Uri "$Url/rest/v1/municipalidades?select=id&limit=1" -Method Get -Headers $Headers
$MuniId = $MuniResponse[0].id
$CatResponse = Invoke-RestMethod -Uri "$Url/rest/v1/categorias?select=id&limit=1" -Method Get -Headers $Headers
$CatId = $CatResponse[0].id

# 2. Insert Test Report with Unique Description
$UniqueDesc = "SEARCH_TEST_KEYWORD_$Rand"
Write-Host "Inserting Report with Desc: $UniqueDesc"

$Body = @{
    descripcion = $UniqueDesc
    ubicacion = "POINT(-57.6470 -25.2867)"
    municipalidad_id = $MuniId
    categoria_id = $CatId
} | ConvertTo-Json

try {
    $ReportResponse = Invoke-RestMethod -Uri "$Url/rest/v1/reportes" -Method Post -Headers $Headers -Body $Body
    $ReqId = $ReportResponse[0].numero_solicitud
    Write-Host "Created Report: $ReqId"
} catch {
    Write-Error "Create Failed: $_"
    exit 1
}

# 3. Test Search Logic
# PostgREST syntax for OR with ILIKE: or=(col.ilike.*val*,col2.ilike.*val*)
# We must ensure proper formatting.
# Using * for wildcards in PostgREST.

Write-Host "Testing Search by Request ID ($ReqId)..."
$SearchTerm = $ReqId
# Note: Parentheses in URL usually denote the OR group. 
$Query = "or=(numero_solicitud.ilike.*$SearchTerm*,descripcion.ilike.*$SearchTerm*)"
# Basic manual encoding to ensure valid URL
$QueryEncoded = [System.Web.HttpUtility]::UrlEncode($Query) 
# Wait, System.Web might not be loaded. Let's use simpler approach or rely on Invoke-RestMethod to handle params if possible, 
# strictly speaking passing query params in Uri string for Invoke-RestMethod is standard.
# Attempting cleaner string without complex encoding first, just careful with characters.
# The previous 400 might be due to unescaped chars or strict parsing.

# Let's try explicit manual string construction that is known to work.
$Uri = "$Url/rest/v1/reportes_final_v1?or=(numero_solicitud.ilike.*$SearchTerm*,descripcion.ilike.*$SearchTerm*)"

Write-Host "Querying: $Uri"

try {
    $SearchResult = Invoke-RestMethod -Uri $Uri -Method Get -Headers $Headers
    if ($SearchResult -is [array]) {
        # It returns an array
        $Found = $SearchResult | Where-Object { $_.numero_solicitud -eq $ReqId }
        if ($Found) {
            Write-Host "SUCCESS: Found report by ID."
        } else {
            Write-Error "FAILURE: Report not in search results."
            exit 1
        }
    } else {
        # Single object or empty (unlikely with array response type usually)
        if ($SearchResult.numero_solicitud -eq $ReqId) {
             Write-Host "SUCCESS: Found report by ID."
        } else {
             Write-Error "FAILURE: Report not found."
             exit 1
        }
    }
} catch {
    Write-Error "Search Failed: $_"
    if ($_.Exception.Response) {
         # Debug body
         $Reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
         Write-Error $Reader.ReadToEnd()
    }
    exit 1
}

Write-Host "Testing Search by Description Keyword ($UniqueDesc)..."
$SearchTerm = $UniqueDesc
$Uri = "$Url/rest/v1/reportes_final_v1?or=(numero_solicitud.ilike.*$SearchTerm*,descripcion.ilike.*$SearchTerm*)"


$SearchResult = Invoke-RestMethod -Uri $Uri -Method Get -Headers $Headers
if ($SearchResult -and $SearchResult.descripcion -eq $UniqueDesc) {
    Write-Host "SUCCESS: Found report by Description."
} else {
    Write-Error "FAILURE: Could not find report by Description."
    exit 1
}

# 4. Verify Standard Filters still work (Empty search)
Write-Host "Testing Standard Filters..."
$Uri = "$Url/rest/v1/reportes_final_v1?municipalidad_id=eq.$MuniId&limit=1"
$FilterResult = Invoke-RestMethod -Uri $Uri -Method Get -Headers $Headers

if ($FilterResult) {
  Write-Host "SUCCESS: Standard filters working."
} else {
    Write-Warning "Standard filters returned empty (might be valid if no reports in muni, but unexpected)"
}

exit 0
