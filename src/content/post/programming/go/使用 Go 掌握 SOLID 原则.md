---
title: 使用 Go 掌握 SOLID 原则
description: 在 Go 语言中应用 SOLID 原则来提升代码质量和可维护性。
publishDate: 30 January 2024
tags:
  - go
---

软件开发是一个不断变化的挑战。为了驾驭这种复杂性，开发者们依靠经过验证的设计原则来构建健壮、灵活且易于管理的代码。其中一套重要的原则就是 **SOLID** (由 Robert C. Martin 首次提出)。

SOLID 是以下五个原则的缩写：单一职责 (Single Responsibility)、开闭 (Open-Closed)、里氏替换 (Liskov Substitution)、接口隔离 (Interface Segregation) 和依赖反转 (Dependency Inversion)。这些原则在提升程序的可维护性、可扩展性和可测试性方面都发挥着关键作用。

尽管 Golang 不是一门纯面向对象的编程语言，我们仍然可以应用 SOLID 原则来改进我们的 Go 代码。在这篇文章中，我们将深入探讨每个原则，理解其含义，并探索如何在 Go 语言中有效地运用这些原则。

## S - 单一职责原则 (Single Responsibility Principle)

单一职责原则 (SRP) 要求一个结构体或包应该专注于单一且明确的功能领域。我们可以把每个结构体想象成一个专业领域的专家。这样的设计让代码结构清晰，降低复杂度。当需要修改结构体的功能时，变更会被限制在局部范围内，使得维护和未来更新变得轻松自如。

「一个类应该有且仅有一个引起它变化的原因」——Robert C. Martin

Go 语言以结构体而非类为主。但别担心，单一职责原则在这里同样适用。我们可以将每个结构体视为一个紧密组织的模块，负责一项明确定义的任务。这种模块化方法使代码保持整洁，降低复杂度，提高可维护性。

单一职责原则的魔力同样延伸到 Go 的包设计中。理想情况下，一个包应该专注于单一功能领域。这样可以最小化依赖关系，保持代码组织有序。通过在结构体和包的设计中都遵循单一职责原则，你就能为构建清晰、可维护且可扩展的 Go 应用打下坚实基础。

以下是一些优秀的包设计示例：

- encoding/json - 提供 JSON 的编码和解码功能。
- net/url - 解析 URL。

以下是一些不太理想的示例：

- utils - 各种杂项功能的大杂烩？

让我们看一个 Go 语言的具体例子，这里有一个 Survey 结构体，它包含一些属性和几个方法：GetTitle()、Validate() 和 Save()：

```go
package survey

type Survey struct {
	Title string
	Questions []string
}

func (s *Survey) GetTitle() string {
	return s.Title
}

func (s *Survey) Validate() bool {
	return len(s.Questions) > 0
}

func (s *Survey) Save() error {
	// saves the survey to the database
	return nil
}
```

当前的 Survey 结构体设计看起来不错，但 Save() 方法的存在违反了单一职责原则 (SRP)。将数据存储和调查问卷（survey）逻辑放在同一个结构体中，会使代码的维护、测试和扩展变得更加困难。

为了遵循单一职责原则，我们应该分离这些职责：

```go
package survey

type Survey struct {
	Title     string
	Questions []string
}

func (s *Survey) GetTitle() string {
	return s.Title
}

func (s *Survey) Validate() bool {
	return len(s.Questions) > 0
}

type Repository interface {
	Save(survey *Survey) error
}

// One of many possible implementations
type InMemoryRepository struct {
	surveys []*Survey
}

func (r *InMemoryRepository) Save(survey *Survey) error {
	r.surveys = append(r.surveys, survey)
	return nil
}

func SaveSurvey(survey *Survey, repo Repository) error {
	return repo.Save(survey)
}
```

现在，Survey 结构体仅负责管理调查数据，而 Repository 接口和 InMemoryRepository 结构体则负责处理数据库操作。

## O - 开闭原则 (Open-Closed Principle)

开闭原则 (OCP) 是良好软件设计的基石。它要求软件实体（类、模块、函数等）在设计时就要考虑到未来的成长性。这意味着它们应该对扩展开放，允许添加新的特性和功能，同时对修改关闭。为了适应新需求而修改现有代码是有风险的，因为这可能会引入 bug 并使未来的维护变得困难。

「模块应该对扩展开放，但对修改关闭」——Robert C. Martin

让我们回到 Survey 的例子。我们来为结构体添加一个新方法 - Export()，用于将调查问卷数据导出到某个外部服务或存储中。由于可能存在多个导出目标，Export() 方法包含了一个 switch 代码块。

```go
package survey

// ...

func ExportSurvey(s *Survey, dst string) error {
	switch dst {
	case "s3":
		// export to s3
		return nil
	case "gcs":
		// export to gcs
		return nil
	default:
		return nil
	}
}
```

如果需要支持新的服务，当前的实现方式就需要修改代码，这违反了开闭原则。

为了遵循开闭原则，我们可以定义一个导出器 (Exporter) 接口，这样就能在不修改现有代码的情况下，为不同的目标添加新的导出器。

```go
package survey

// ...

type Exporter interface {
	Export(survey *Survey) error
}

type S3Exporter struct{}

func (e *S3Exporter) Export(survey *Survey) error {
	return nil
}

type GCSExporter struct{}

func (e *GCSExporter) Export(survey *Survey) error {
	return nil
}

func ExportSurvey(s *Survey, exporter Exporter) error {
	return exporter.Export(s)
}
```

这符合开闭原则，提高了代码的灵活性和可维护性。我们的代码对扩展开放（我们可以添加新的 Expoter），但对修改关闭（我们不需要更改 Export() 函数）。

## L - 里氏替换原则（Liskov Substitution Principle）

里氏替换原则 (Liskov Substitution Principle, LSP) 确保对象可以在不破坏程序的情况下进行替换。虽然 Go 语言没有传统的继承机制，但通过接口可以实现这一原则。任何类型只要实现了与接口签名匹配的方法，就可以「实现」该接口。这种设计提高了代码的灵活性——只要类型满足接口契约（contract），使用该接口的代码就可以与各种不同的类型协同工作。

「如果 S 是 T 的子类型，那么在不破坏程序正确性的前提下，T 类型的对象可以被 S 类型的对象所替换」——B. Liskov

在 Go 语言中，io.Writer 接口是一个很好的 LSP 示例。

```go
type Writer interface {
	Write(buf []byte) (n int, err error)
}
```

io.Writer 接口的精妙之处在于它能够将字节切片 (byte slice) 写入任何数据流中，无论是文件还是 HTTP 响应等。

回到我们的 Survey 结构体，我们可以添加一个 Write() 方法来将调查对象写入某个位置。通过让该方法接受 io.Writer 作为参数，我们可以让具体实现来决定写入的目标位置。

```go
func WriteSurvey(s *Survey, writer io.Writer) (int, error) {
	b, err := json.Marshal(s)
	if err != nil {
		return 0, err
	}

	return writer.Write(b)
}
```

现在这个函数的使用者拥有很大的灵活性，因为他们只需要使用任何实现了 io.Writer 接口的结构体即可。

```go
file, err := os.Open("file.go")
if err != nil {
	log.Fatal(err)
}

survey := &Survey{Title: "Feedback Form"}
WriteSurvey(&Survey, file)
```

## I - 接口隔离原则（Interface Segregation Principle）

接口隔离原则 (Interface Segregation Principle, ISP) 规定使用者（clients）不应该被迫依赖它们不使用的接口。这一原则鼓励创建更小、更专注的接口，而不是大而全的单体接口。

「使用者不应该被迫依赖它们不使用的方法」——Robert C. Martin

以 Go 的 io 包为例，它提供了多个小型接口及其组合，比如 io.Reader、io.ReadWriter、io.ReadCloser、io.ReadWriteCloser 等。

在我们的 Survey 示例中，假设我们有多种问题类型：文本和下拉框。我们可以定义一个通用的 Question 接口。

```go
type Question interface {
	SetTitle()
	AddOption()
}

type TextQuestion struct {
	Title string
}

func (q *TextQuestion) SetTitle(title string) {
	q.Title = title
}

func (q *TextQuestion) AddOption(option string) {
	// not supported as text fields don't have options
}

type DropdownQuestion struct {
	Title   string
	Options []string
}

func (q *DropdownQuestion) SetTitle(title string) {
	q.Title = title
}

func (q *DropdownQuestion) AddOption(option string) {
	q.Options = append(q.Options, option)
}
```

在 Question 接口中，AddOption() 方法显得格格不入。这个方法对于 TextQuestion 来说毫无意义，违反了接口隔离原则。以下是如何遵循接口隔离原则来改进设计：将 Question 接口拆分成更小、更专注的接口：

```go
type Question interface {
	SetTitle()
}

type QuestionWithOptions interface {
	Question
	AddOption()
}

type TextQuestion struct {
	Title string
}

func (q *TextQuestion) SetTitle(title string) {
	q.Title = title
}

type DropdownQuestion struct {
	Title   string
	Options []string
}

func (q *DropdownQuestion) SetTitle(title string) {
	q.Title = title
}

func (q *DropdownQuestion) AddOption(option string) {
	q.Options = append(q.Options, option)
}
```

## D - 依赖反转原则 (Dependency Inversion Principle)

依赖反转原则 (DIP) 指出高层模块不应该依赖于低层模块，它们都应该依赖于抽象。

用更简单的话说，DIP 建议我们的代码应该依赖于接口或抽象类，而不是具体的类或函数。这种控制的反转降低了软件不同部分之间的耦合度，使其更加模块化、易于扩展和测试。

「抽象不应该依赖于细节，细节应该依赖于抽象」——Robert C. Martin

让我们以 SurveyManager 结构体为例，它负责处理调查问卷的创建，显然它需要依赖数据库。

```go
type InMemoryRepository struct {
	surveys []*Survey
}

type SurveyManager struct {
	store InMemoryRepository
}

func NewSurveyManager() *SurveyManager {
	return &SurveyManager{
		store: InMemoryRepository{},
	}
}

func (m *SurveyManager) Save(survey *Survey) error {
	return m.store.Save(survey)
}
```

这里的糟糕设计在于它过度依赖 InMemoryRepository，违反了高层模块不应该依赖低层模块的原则。

我们可以通过使用接口和构造函数来解耦这些组件：

```go
type Repository interface {
	Save(survey *Survey) error
}

type SurveyManager struct {
	store Repository
}

func NewSurveyManager(store Repository) *SurveyManager {
	return &SurveyManager{
		store: store,
	}
}

func (m *SurveyManager) Save(survey *Survey) error {
	return m.store.Save(survey)
}
```

## 总结

SOLID 原则是构建整洁、可维护和可扩展软件的基石。虽然具体实现细节会因编程语言而异 (比如 Go 语言使用接口组合而非继承)，但 SOLID 的核心理念具有普遍适用性。通过遵循这些原则，开发者可以编写出更具适应性、更易测试，并且最终能够更好地应对变化的代码，这一点在任何编程语言中都是适用的。
