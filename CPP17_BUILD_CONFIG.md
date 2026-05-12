# C++17 Build Configuration for Foundation V1 Server

## Overview
This document describes the C++17 compilation configuration applied to the foundation-v1-server project to ensure proper compilation of native modules like `foundation-multi-hashing`.

## Configuration Files

### 1. binding.gyp
Located at the repository root, this file configures how Node.js native modules are compiled.

**Key Settings:**
- **Linux/Unix**: `-std=c++17 -fvisibility=hidden`
- **macOS**: CLANG with C++17 dialect and libc++
- **Windows**: MSVC with `/std:c++17 /EHsc`

### 2. GitHub Actions Workflow (.github/workflows/build.yml)
Both build and coverage jobs now include C++17 compilation flags:

```yaml
env:
  CXXFLAGS: "-std=c++17"
  CPPFLAGS: "-std=c++17"
```

## Build Instructions

### Local Development

#### Prerequisites
```bash
# Ubuntu/Debian
sudo apt-get install build-essential libsodium-dev libboost-system-dev

# macOS
brew install boost libsodium

# Windows (requires Visual Studio with C++ tools)
# Install Visual Studio with C++ Build Tools
```

#### Building with C++17
```bash
# Set environment variables
export CXXFLAGS="-std=c++17"
export CPPFLAGS="-std=c++17"

# Install dependencies
npm install

# Run tests
npm test

# Production build
npm run prod:start
```

### Docker Build

```dockerfile
FROM node:20

# Install dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    libsodium-dev \
    libboost-system-dev

WORKDIR /app
COPY . .

# Set C++17 flags
ENV CXXFLAGS="-std=c++17"
ENV CPPFLAGS="-std=c++17"

RUN npm install
RUN npm test
CMD ["npm", "start"]
```

## Verification

### Check Compilation Flags
```bash
# View binding.gyp configuration
cat binding.gyp

# Check environment variables during build
npm install --verbose
```

### Test Native Module Compilation
```bash
# Rebuild native modules
npm rebuild

# Verify compilation output
ls node_modules/foundation-multi-hashing/build/Release/
```

## Troubleshooting

### Issue: "error: invalid value 'c++17' in '-std=c++17'"
**Solution**: Update your compiler to a version that supports C++17
- GCC: 5.0 or later
- Clang: 3.5 or later
- MSVC: Visual Studio 2015 or later

### Issue: "fatal error: 'nan.h' file not found"
**Solution**: Ensure NaN (Native Abstractions for Node.js) is installed
```bash
npm install nan
```

### Issue: Module compilation fails on macOS
**Solution**: Ensure Xcode Command Line Tools are installed
```bash
xcode-select --install
```

## Platform-Specific Notes

### Linux/Ubuntu
- GCC 7+ or Clang 5+ recommended for full C++17 support
- Install libboost-system-dev for compilation of boost-dependent code

### macOS
- Xcode 9.4+ required for C++17 support
- libc++ standard library is automatically used

### Windows
- Visual Studio 2015 or later required
- `/std:c++17` flag is set in msvs_settings

## CI/CD Integration

The GitHub Actions workflow automatically:
1. Installs build tools and dependencies
2. Sets CXXFLAGS and CPPFLAGS environment variables
3. Runs `npm install` with C++17 compilation
4. Executes test suite
5. Uploads coverage reports to Codecov

## References

- [Node.js Native Addons Documentation](https://nodejs.org/api/addons.html)
- [node-gyp Documentation](https://github.com/nodejs/node-gyp)
- [C++17 Standard Features](https://en.cppreference.com/w/cpp/17)
- [Foundation Stratum Repository](https://github.com/blinkhash/foundation-v1-stratum)
- [Foundation Multi-Hashing Repository](https://github.com/blinkhash/foundation-v1-multi-hashing)

## Support

For issues related to C++17 compilation, please:
1. Check the troubleshooting section above
2. Review GitHub Actions logs
3. Open an issue with compilation error details
