
# Configuration
$Url = "https://enkwnlgjslmtxuysdkfc.supabase.co"
$Key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVua3dubGdqc2xtdHh1eXNka2ZjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkxNzcyMzUsImV4cCI6MjA4NDc1MzIzNX0.h6iTvofQW1eEpcX8Esw_4KEtnY6q3zFcWE0i8w0rDJ8"

$Headers = @{
    "apikey" = $Key
    "Authorization" = "Bearer $Key"
    "Content-Type" = "application/json"
    "Prefer" = "return=representation"
}

Write-Host "Fetching Municipality..."
$MuniResponse = Invoke-RestMethod -Uri "$Url/rest/v1/municipalidades?select=id&limit=1" -Method Get -Headers $Headers
$MuniId = $MuniResponse[0].id

Write-Host "Fetching Category..."
$CatResponse = Invoke-RestMethod -Uri "$Url/rest/v1/categorias?select=id&limit=1" -Method Get -Headers $Headers
$CatId = $CatResponse[0].id

if (-not $MuniId -or -not $CatId) {
    Write-Error "Could not fetch dependencies (Muni: $MuniId, Cat: $CatId)"
    exit 1
}

# 1. Sign Up (Create Temp User) to get Token
$Rand = Get-Random
$Email = "verify_bot_$Rand@example.com"
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
        Write-Warning "SignUp successful but no Token returned (Email Confirmation might be ON). Trying Login..."
        Write-Error "No Token from Signup. Cannot proceed without Email Confirmation."
        exit 1
    }
    
    Write-Host "Authenticated! Token acquired."
    $Headers["Authorization"] = "Bearer $Token"
    
} catch {
    Write-Error "Auth Failed: $_"
    exit 1
}


Write-Host "Inserting Test Report..."
$Body = @{
    descripcion = "Test Automatizado Verificacion ID"
    ubicacion = "POINT(-57.6470 -25.2867)"
    municipalidad_id = $MuniId
    categoria_id = $CatId
} | ConvertTo-Json

try {
    $ReportResponse = Invoke-RestMethod -Uri "$Url/rest/v1/reportes" -Method Post -Headers $Headers -Body $Body
    $ReqId = $ReportResponse[0].numero_solicitud
    
    if ($ReqId -match "^REQ-\d{4}-\d{5}$") {
        Write-Host "SUCCESS: Report Created with valid ID: $ReqId"
        exit 0
    } else {
        Write-Error "FAILURE: Report created but ID format invalid or null: $ReqId"
        exit 1
    }
} catch {
    Write-Error "API Error: $_"
    if ($_.Exception.Response) {
        $Reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        Write-Error $Reader.ReadToEnd()
    }
    exit 1
}
