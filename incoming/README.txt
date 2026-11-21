Español 1 vocabulary photos for emma-app
Branch: cursor/ellen-spanish-photos
Do not merge or deploy from this folder; unpack onto the branch as public/espanol/.

Archive: espanol-photos.tgz
SHA256: 5a139b07ad64cc0d312c2039166f577f62c35d35e9f5962cccaa85196b8a6696
Photos: 87 JPEGs (max 600px, quality 80) + mapping.json

Decode and extract (from the repo root):

  cat incoming/espanol-photos.tgz.b64.part* | base64 -d > espanol-photos.tgz
  echo "5a139b07ad64cc0d312c2039166f577f62c35d35e9f5962cccaa85196b8a6696  espanol-photos.tgz" | sha256sum -c
  tar xzf espanol-photos.tgz

This creates:
  public/espanol/photos/<slug>.jpg
  public/espanol/mapping.json
