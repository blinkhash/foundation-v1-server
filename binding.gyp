{
  "targets": [
    {
      "target_name": "foundation_multi_hashing",
      "sources": [
        "src/multihashing.cc"
      ],
      "cflags_cc": ["-std=c++17", "-fvisibility=hidden"],
      "cflags": ["-Wall", "-Wextra", "-std=c++17"],
      "xcode_settings": {
        "GCC_ENABLE_CPP_RTTI": "YES",
        "GCC_ENABLE_CPP_EXCEPTIONS": "YES",
        "CLANG_CXX_LANGUAGE_DIALECT": "c++17",
        "CLANG_CXX_LIBRARY": "libc++",
        "MACOSX_DEPLOYMENT_TARGET": "10.13",
        "OTHER_CPLUSPLUSFLAGS": ["-std=c++17"]
      },
      "msvs_settings": {
        "VCCLCompilerTool": {
          "AdditionalOptions": ["/std:c++17", "/EHsc"],
          "RuntimeLibrary": 2
        }
      },
      "conditions": [
        ["OS=='win'", {
          "libraries": []
        }],
        ["OS=='mac'", {
          "libraries": ["-stdlib=libc++"]
        }]
      ]
    }
  ]
}
