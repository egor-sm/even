#include "app/web/web_resources.h"

#include <ui_assets.h>

#include <string_view>
#include <unordered_map>

namespace even {

namespace {

juce::ZipFile &getWebUiArchive() {
  static juce::MemoryInputStream stream{UiAssets::ui_zip, UiAssets::ui_zipSize, false};
  static juce::ZipFile archive{stream};
  return archive;
}

juce::String getMimeType(const juce::String &path) {
  static const std::unordered_map<std::string_view, const char *> mimeTypes{
      {"html", "text/html"},       {"js", "text/javascript"}, {"css", "text/css"},  {"json", "application/json"},
      {"map", "application/json"}, {"svg", "image/svg+xml"},  {"png", "image/png"}, {"ico", "image/x-icon"},
      {"woff2", "font/woff2"},     {"ttf", "font/ttf"},
  };

  const auto extension = path.fromLastOccurrenceOf(".", false, false).toLowerCase().toStdString();

  if (const auto it = mimeTypes.find(extension); it != mimeTypes.end())
    return it->second;

  return "application/octet-stream";
}

} // namespace

std::optional<juce::WebBrowserComponent::Resource> findWebUiResource(const juce::String &url) {
  // WebView2 passes the query string along; WKWebView does not.
  const auto file = url.upToFirstOccurrenceOf("?", false, false);
  const auto path = file == "/" ? juce::String{"index.html"} : file.fromFirstOccurrenceOf("/", false, false);

  auto &archive = getWebUiArchive();
  const auto *entry = archive.getEntry(path);

  if (entry == nullptr)
    return std::nullopt;

  const std::unique_ptr<juce::InputStream> input{archive.createStreamForEntry(*entry)};

  if (input == nullptr)
    return std::nullopt;

  std::vector<std::byte> data(static_cast<size_t>(entry->uncompressedSize));

  if (input->read(data.data(), static_cast<int>(data.size())) != static_cast<int>(data.size()))
    return std::nullopt;

  return juce::WebBrowserComponent::Resource{.data = std::move(data), .mimeType = getMimeType(path)};
}

} // namespace even
