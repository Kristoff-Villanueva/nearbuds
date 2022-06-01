const renderTemplate = async (path, data) => {
  const response = await fetch(path)
  const template = await response.text()
  const rendered = Mustache.render(template, data)

  document.getElementById('target').innerHTML = rendered
}