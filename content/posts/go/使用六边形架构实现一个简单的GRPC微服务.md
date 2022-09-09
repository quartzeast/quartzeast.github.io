---
title: "使用六边形架构实现一个简单的GRPC微服务"
date: 2022-09-08T13:49:56+08:00
draft: true
author: "Hugo Authors"
description: "Sample article showcasing basic Markdown syntax and formatting for HTML elements."
tags:
  - "Go"
---

### This chapter covers

- Using `Hexagonal Architecture` for microservice projects
- Setting up toolkits for the services
- Running a basic microservice application
- Making initial request to running application

It is very normal to say _How should I structure my project?_ before writing the first line of your Go microservice project. The answer to this question might seem very difficult at first, but you can see how easy it is if you apply some common software architecture pattern. Those patterns are mostly for solving the modularizaton problems to have testable components. Let’s see how we can apply those principles to a Go microservice project and perform some test to see how gRPC endpoints work.

## 4.1 Hexagonal Architecture

_Hexagonal Architecture_, proposed by Alistair Cockburn in 2005, is an architectural pattern that aims to build loosely coupled application components that can be connected to each other via ports and adapters. In Hexagonal Architecture, consumer arrives at application at **Port** via an **Adapter** and the output is sent from application through a Port to an Adapter. Therefore, Hexagonal Architecture is also known as Ports & Adapters. Using Ports and Adapters creates an abstraction layer that protects the core of the application from external dependencies. Now that we understand the components of Hexagonal Architecture in general, let’s dive a bit deeper for each of them.

### 4.1.1 Application

Application is the technology agnostic component that contains all the business logic that orchestrates the functionalities or use cases. Application is represented by a hexagon which basically receives write and read queries from the Ports and sends them to external actors like database, third-party service via Ports. Hexagon is used to visually represent multiple Port / Adapter combinations for an application and show the difference between left side (or driving side) and right side (or driven side).

### 4.1.2 Actors

Actors are designed to interact with humans, other applications, and any other software or hardware device. There are 2 types of actors: Driver (or Primary) Actors and Driven (or Secondary) Actors.

Driver Actors are responsible for triggering the communication with the application to invoke a service on the application. CLIs, Controllers are good examples to Driver Adapters since they take user input and send them to application via port.

Driven Actors expect to see communication is triggered by the application itself. For example, application triggers a communication to save data into MySQL.

### 4.1.3 Ports

Ports are generally interfaces that contain information about interacting between actor and application. Driver ports contains set of actions that application provides and exposes to public. Driven ports contain set of actions, and they should be implemented by actors.

### 4.1.4 Adapters

Adapters mostly deal with transformation between request from actor to application, and opposite. This transformation is needed since actor and application have different strategies, and data transformation helps application to understand the request coming from actors. For example, a specific driver adapter can transform technology specific request into a call to application service. In same way, a driven adapter can convert technology agnostic request from application into a technology specific request on driven port.

As you can see in Figure 4.1, Application has its own hexagon that contains business logic, and it can be orchestrated by Adapters by using Ports in Hexagon. CLI and Web application are 2 candidates to Adapter, and in same way data is saved into MySQL or sent to another application by a specific implementation.

<img src="https://drek4537l1klr.cloudfront.net/babal/v-2/Figures/04image002.png" alt="img" style="zoom:67%;" />

Ojunc dXFY aesmk ietmnmienpgl anhgolexa eceicrhrutta ireesa necis vw kct aeadyrl mifailar wyrj epdaarts uu kzg le dCET tubss er access retho erivsces. Rontreh ntlaeotpi avadgenat lv usgni qXZY ja hnainlgd besinssu losmde rwjp ryo uofh xl oropt eassesgm, nzg jrzp eatvaagnd aj tkkm selbivi licesepayl zevn qxb vykn rk ceadtulpi emdslo etwbeen enohlxaag asyelr. Ukw rrsy ow aov org allvoer priuetc xl drk Hanleoxag Butciretcehr, rfx’a kosr z feke bkw re artst tmieloaptemnin le c Qx Wcreivsciero bu iusgn podesrpo ivenoctnsno.

## 4.2 Order Service Implementation

T neacl tchuieercrta elylra sesvrdee s ffvw-dfnedei ceptojr sctruuetr. Jl wk jmc er xzq hxelnoaag urctchiaetre elt kyr eccsmsiiorrve, rxnb hnigav amilgfunne rfeldo easmn ryzr ttsae osnaloiti leelv jz ptrntaomi. Creeof roq trtas kl tonamiietpelmn sespt, fxr’c xrzv s fvek wrcq oulwd vg rqv rpoepr erldfo ttsreruuc le s riemsvrccioe oerjptc rrzp aqkc aoxhengla urtcthaeicer vlt clare tiniooals eebntew smleudo ca nswoh nj Vrgeiu 4.2.

##### Figure 4.2 Project folder structure of a Go microservice written by using Hexagonal Architecture.

<img src="https://drek4537l1klr.cloudfront.net/babal/v-2/Figures/04image003.png" alt="img" style="zoom:67%;" />

### 4.2.1 Project Folders

While there is no written rule for the folder structure for a hexagonal architecture, you will usually encounter the following folders in a typical Go project that uses hexagonal architecture.

**Application folder:** This folder contains the main business logic about microservice. This business logic is a combination of domain model that refers to business entitiy, and an api exposes core functionalities to other modules

**Port folder:** This folder contains the contract information for integration between the core application and third parties. This can be a contract about how to access core application features, or another contract to specify available features for a database system if you are using database for persistence layer.

**Adapter folder:** This folder contains the concrete implementation to use contracts defined in the ports. For example, gRPC can be an adapter that contains concrete implementation that handles requests and uses api port to access core functionalities. For example, if you have an application that has some set of functionalities, and you are about to expose it to customers. Set of functionalities can be CreateProduct, GetProduct, etc… and you can expose them to customer via REST, gRPC and so on. Both REST and gRPC adapters will use the contracts of that functionalities as defined in port layer. We will revisit this topic with more advanced examples in upcoming sections

All the above folders can be located inside `internal` folder to separate operational functionalities like infra, deployment from application core logic. Beside internal folder, there can be `cmd` folder to define an entry point for your application. Entry point contains also dependency injection mechanism like preparing database connection and pass it to application layer. Finally, there can be utility folders like `config` to provide a configuration structure to your application so that consumer can know what the possible parameters are they can pass while running application. Now that we understand how folder structure looks like as you can see in Figure 4.2, let’s take a look how to implement project step by step.

### 4.2.2 Initializing Go Project

Go Module helps you to create projects for better modularity and easy dependency management. In order to create a microservice project which is called order, and initialize it as a Go project, you can use following.

```
mkdir -p microservices/order
cd microservices/order
go mod init github.com/<username>/microservices/order
```

`The go mod init` command accepts a VCS URL to prepare dependency structure. For example, when you provide a version of this module to use on another module, it will resolve that tag from the VCS that you provided to module initialization. After the initialization, the `go.mod` file will be created and at first it contains only module information and supported Go version.

```
module github.com/huseyinbabal/microservices/order

go 1.17
```

```go
cd order
mkdir cmd
mkdir config
mkdir -p internal/adapters/db
mkdir -p internal/adapters/grpc
mkdir -p internal/application/api
mkdir -p internal/application/domain
mkdir -p internal/ports
```

### 4.2.3 Implementing Application Core

In Hexagonal Architecture, outer layers (outer hexagons) depend on inner layers (inner hexagon) so that it makes everything easier to start implementing application core first and implement outer layers to depend on that. For example, Web or CLI layer depends on Application layer as you can see in Figure 4.1. Since all the operations will be performed on Order domain object in Application layer, let’s create the necessary Go file, add structs inside it, and add domain methods once needed.

```
touch internals/application/domain/order.go
```

Domain objects in Go are mostly specified by structs that contain field type, field name and serialization config via tags. For example, to specify a `CustomerID` field with an `int64` type of `Order` and specify a field name as `customer_id` after json serialization (e.g., to save in MongoDB), you can use the following.

```go
CustomerID int64       `json:"customer_id"`
```

Based on above explanation, `order.go` contains following content:

```go
package domain

import (
    "time"
)

type OrderItem struct {
    ProductCode string  `json:"product_code"`
    UnitPrice   float32 `json:"unit_price"`
    Quantity    int32   `json:"quantity"`
}

type Order struct {
    ID         int64       `json:"id"`
    CustomerID int64       `json:"customer_id"`
    Status     string      `json:"status"`
    OrderItems []OrderItem `json:"order_items"`
    CreatedAt  int64       `json:"created_at"`
}

func NewOrder(customerId int64, orderItems []OrderItem) Order {
    return Order{
        CreatedAt:  time.Now().Unix(),
        Status:     "Pending",
        CustomerID: customerId,
        OrderItems: orderItems,
    }
}
```

Cpvxt aj ethnroa apackge urend bro anticpoalpi, which jz adcell `api,` snq jr oacstnin nhotrae Qx ljof vr oclnrto xgr etats lx c fpicseic reord. Nunrgi oqr apltapoiinc iitanaiiltozin, jr jc xceetdep re vcx s nndypdeece iejitnnco nahimmsec kr ijetcn yg rdeatap(ncorctee tetmaeinomipnl klt icspiecf UX gtlyonceoh) jrnk rxd ctlaipinoap kz zrpr vru sjq nzs sreot rgo estat lv pcfiicse edrro rnjv dbtaseaa twitouh iendgne rv nowk qor ilrnaetns kl gq etdpraa. Abrs zj wdp `Application` spended ne zn iteearfcn `ports.DBPort` naietsd kl ncetorec nieimaepomtltn el yg rtaeapd. Xqv Rjq etfraienc zhav yrcj grtv rv ecssca odr ofts pu eradatp rv axco rdreo ianimfrnoto rkjn oyr bsaadeat niiwth `PlaceOrder` tdmohe.

```
touch internal/application/api/api.go
```

[copy](<javascript:void(0)>)

the content of `api.go` will be as follows:

```
123456789101112131415161718192021222324package api

import (
    "github.com/huseyinbabal/microservices/order/internal/application/core/domain"
    "github.com/huseyinbabal/microservices/order/internal/ports"
)

type Application struct {
    db ports.DBPort
}

func NewApplication(db ports.DBPort) *Application {
    return &Application{
        db: db,
    }
}

func (a Application) PlaceOrder(order domain.Order) (domain.Order, error) {
    err := a.db.Save(&order)
    if err != nil {
        return domain.Order{}, err
    }
    return order, nil
}
```

### 4.2.4 Implementing Ports

Vtera tvs hric tnefisaerc natiiocnng angerle tmsedho otaub xsda larye. Vvt epalexm, xw dmpneietlem `PlaceOrder` tdmeho jn qkr spvuiero nesotci, chn jl dhe eylaucflr kvfe sr jr, dvd san zxx jr ptsenmlmie s emohtd vl gjc teqr. Rvq `PlaceOrder` thomed islymp etacpcs z nimdao bcjtoe pnc asevs vjnr urx saedtaab. Rq nigus aruj jkln, kw nsz maseus rrzd hervewen bkg cnwr re etaerc nc `Application`, pdv nvuo re cycz vpr pg paetdra rx rsrb. Abx `Application` evass sn orrde nrvj rvp dabeasat dd gisnu yrv feeeecnrr `db` ejz brv reveirec nfotuinc. Zrk’a asttr tnenilmipgme yor sgj rvgt:

```
touch internal/ports/api.go
```

[copy](<javascript:void(0)>)

Rajd fljv mpiyls cniosnat nc eceniraft grjw fnde kkn mhoted, `PlaceOrder,` zz sflowlo:

```
package ports

import "github.com/huseyinbabal/microservices/order/internal/application/core/domain"

type APIPort interface {
    PlaceOrder(order domain.Order) (domain.Order, error)
}
```

[copy](<javascript:void(0)>)

Mjkdf `APIPort` aj txl txsk tocinpailpa ilafsennciituot, `DBPort` hespl xgr `Application` er liuflfl ajr ttcnfouniseaiil. Por’a erctae pp ethr:

```
touch internal/ports/db.go
```

[copy](<javascript:void(0)>)

```
DBPort` ja xotd plsmei tnraeifce zrrp oinasctn `Get` nzy `Save` motdeh nzg vl uersco jr edpsdne nk pplonicaita noamdi doelm, hwhic jz `Order:
package ports

import "github.com/huseyinbabal/microservices/order/internal/application/core/domain"

type DBPort interface {
    Get(id string) (domain.Order, error) #A
    Save(*domain.Order) error #B
}
```

[copy](<javascript:void(0)>)

`The Application` pdedesn kn `DBPort` skj rqv trfnaceei, yrg wx kvnu xr cazu z corneect epiamtlinmeotn indugr iinztoiitiaanl, xz kfr’z ksdx c xefx rs wycr eoccnert ieelmnmtpsoanit vl otrps vvef efjk.

### 4.2.5 Implementing Adapters

```
go get -u gorm.io/gorm
go get -u gorm.io/gorm/mysql
```

[copy](<javascript:void(0)>)

```
touch internal/adapters/db/db.go
```

[copy](<javascript:void(0)>)

##### Figure 4.3 One-to-Many relationship between `orders` and `order_items` table.

![img](https://drek4537l1klr.cloudfront.net/babal/v-2/Figures/04image004.png)

```go
package db

import (
    "fmt"
    "github.com/huseyinbabal/microservices/order/internal/application/core/domain"
    "gorm.io/driver/mysql"
    "gorm.io/gorm"
)

type Order struct {
    gorm.Model
    CustomerID int64
    Status     string
    OrderItems []OrderItem
}

type OrderItem struct {
    gorm.Model
    ProductCode string
    UnitPrice   float32
    Quantity    int32
    OrderID     uint
}
```

[copy](<javascript:void(0)>)

```go
type Adapter struct {
    db *gorm.DB
}
```

[copy](<javascript:void(0)>)

```go
func NewAdapter(dataSourceUrl string) (*Adapter, error) {
    db, openErr := gorm.Open(mysql.Open(dataSourceUrl), &gorm.Config{})
    if openErr != nil {
        return nil, fmt.Errorf("db connection error: %v", openErr)
    }

    err := db.AutoMigrate(&Order{}, OrderItem{})
    if err != nil {
        return nil, fmt.Errorf("db migration error: %v", err)
    }
    return &Adapter{db: db}, nil
}
```

```
func (a Adapter) Get(id string) (domain.Order, error) { #A
    var orderEntity Order
    res := a.db.First(&orderEntity, id) #B
    var orderItems []domain.OrderItem
    for _, orderItem := range orderEntity.OrderItems { #C
        orderItems = append(orderItems, domain.OrderItem{
            ProductCode: orderItem.ProductCode,
            UnitPrice:   orderItem.UnitPrice,
            Quantity:    orderItem.Quantity,
        })
    }
    order := domain.Order{ #D
        ID:         int64(orderEntity.ID),
        CustomerID: orderEntity.CustomerID,
        Status:     orderEntity.Status,
        OrderItems: orderItems,
        CreatedAt:  orderEntity.CreatedAt.UnixNano(),
    }
    return order, res.Error
}
```

[copy](<javascript:void(0)>)

### 4.2.6 Implementing gRPC Adapter

```
type Adapter struct {
    api  ports.APIPort #A
    port int #B
    order.UnimplementedOrderServer #C
}
```

[copy](<javascript:void(0)>)

```
func NewAdapter(api ports.APIPort, port int) *Adapter {
    return &Adapter{api: api, port: port}
}
```

[copy](<javascript:void(0)>)

```
func (a Adapter) Run() {
    var err error

    listen, err := net.Listen("tcp", fmt.Sprintf(":%d", a.port))
    if err != nil {
        log.Fatalf("failed to listen on port %d, error: %v", a.port, err)
    }

    grpcServer := grpc.NewServer()
    order.RegisterOrderServer(grpcServer, a)
    if config.GetEnv() == "development" {
        reflection.Register(grpcServer)
    }

    if err := grpcServer.Serve(listen); err != nil {
        log.Fatalf("failed to serve grpc on port ")
    }

}
```

```
func (a Adapter) Create(ctx context.Context, request *order.CreateOrderRequest) (*order.CreateOrderResponse, error) {
    var orderItems []domain.OrderItem
    for _, orderItem := range request.OrderItems {
        orderItems = append(orderItems, domain.OrderItem{
            ProductCode: orderItem.ProductCode,
            UnitPrice:   orderItem.UnitPrice,
            Quantity:    orderItem.Quantity,
        })
    }
    newOrder := domain.NewOrder(request.UserId, orderItems)
    result, err := a.api.PlaceOrder(newOrder)
    if err != nil {
        return nil, err
    }
    return &order.CreateOrderResponse{OrderId: result.ID}, nil
}
```

```
12touch internal/adapters/grpc/grpc.go
touch internal/adapters/grpc/server.go
```

[copy](<javascript:void(0)>)

```
go get github.com/huseyinbabal/microservices-proto/golang/order
```

[copy](<javascript:void(0)>)

```
package grpc

import (
    "context"
    "github.com/huseyinbabal/microservices-proto/golang/order"
    "github.com/huseyinbabal/microservices/order/internal/application/core/domain"
)

func (a Adapter) Create(ctx context.Context, request *order.CreateOrderRequest) (*order.CreateOrderResponse, error) {
    var orderItems []domain.OrderItem
    for _, orderItem := range request.OrderItems {
        orderItems = append(orderItems, domain.OrderItem{
            ProductCode: orderItem.ProductCode,
            UnitPrice:   orderItem.UnitPrice,
            Quantity:    orderItem.Quantity,
        })
    }
    newOrder := domain.NewOrder(request.UserId, orderItems)
    result, err := a.api.PlaceOrder(newOrder)
    if err != nil {
        return nil, err
    }
    return &order.CreateOrderResponse{OrderId: result.ID}, nil
}
```

[copy](<javascript:void(0)>)

```
package grpc

import (
    "fmt"
    "github.com/huseyinbabal/microservices-proto/golang/order" #A
    "github.com/huseyinbabal/microservices/order/config" #B
    "github.com/huseyinbabal/microservices/order/internal/ports"
    "google.golang.org/grpc/reflection" #C
    "log"
    "net"

    "google.golang.org/grpc"
)

type Adapter struct {
    api  ports.APIPort
    port int
    order.UnimplementedOrderServer
}

func NewAdapter(api ports.APIPort, port int) *Adapter {
    return &Adapter{api: api, port: port}
}

func (a Adapter) Run() {
    var err error

    listen, err := net.Listen("tcp", fmt.Sprintf(":%d", a.port))
    if err != nil {
        log.Fatalf("failed to listen on port %d, error: %v", a.port, err)
    }

    grpcServer := grpc.NewServer()
    order.RegisterOrderServer(grpcServer, a)
    if config.GetEnv() == "development" {
        reflection.Register(grpcServer)
    }

    if err := grpcServer.Serve(listen); err != nil {
        log.Fatalf("failed to serve grpc on port ")
    }

}
```

[copy](<javascript:void(0)>)

### 4.2.7 Dependency Injection & Running the Application

```
touch config/config.go
```

[copy](<javascript:void(0)>)

```
123456789101112131415161718192021222324252627282930313233package config

import (
    "log"
    "os"
    "strconv"
)

func GetEnv() string {
    return getEnvironmentValue("ENV")
}

func GetDataSourceURL() string {
    return getEnvironmentValue("DATA_SOURCE_URL")
}

func GetApplicationPort() int {
    portStr := getEnvironmentValue("APPLICATION_PORT")
    port, err := strconv.Atoi(portStr)

    if err != nil {
        log.Fatalf("port: %s is invalid", portStr)
    }

    return port
}
func getEnvironmentValue(key string) string {
    if os.Getenv(key) == "" {
        log.Fatalf("%s environment variable is missing.", key)
    }

    return os.Getenv(key)
}
```

```
touch cmd/main.go
```

[copy](<javascript:void(0)>)

```
package main

import (
    "github.com/huseyinbabal/microservices/order/config"
    "github.com/huseyinbabal/microservices/order/internal/adapters/db"
    "github.com/huseyinbabal/microservices/order/internal/adapters/grpc"
    "github.com/huseyinbabal/microservices/order/internal/application/core/api"
    "log"
)

func main() {
    dbAdapter, err := db.NewAdapter(config.GetDataSourceURL())
    if err != nil {
        log.Fatalf("Failed to connect to database. Error: %v", err)
    }

    application := api.NewApplication(dbAdapter)
    grpcAdapter := grpc.NewAdapter(application, config.GetApplicationPort())
    grpcAdapter.Run()
}
```

```
docker run -p 3306:3306 \
    -e MYSQL_ROOT_PASSWORD=verysecretpass \
-e MYSQL_DATABASE=order mysql
```

In this case our data source url will be:

```
root:verysecretpass@tcp(127.0.0.1:3306)/order
```

[copy](<javascript:void(0)>)

Jn dorre er ynt brk orrde rvecsei aipnaclpoti, pde nac pxa ilgnoowlf:

```
DATA_SOURCE_URL=root:verysecretpass@tcp(127.0.0.1:3306)/order \
APPLICATION_PORT=3000 \
ENV=development \
go run cmd/main.go
```

### 4.2.8 Calling gRPC endpoint

The Order application has Order service and Create rpc inside that. In order to send Create Order request, you can pass CreateOrderRequest as json to grpcurl as follows:

```
grpcurl -d '{"user_id": 123, "order_items": [{"product_code": "prod", "quantity": 4, "unit_price": 12}]}' -plaintext localhost:3000 Order/Create
```

[copy](<javascript:void(0)>)

It is very similar to curl, as you can see it accepts request payload with `-d` param. `-plaintext` param is for disabling TLS during gRPC communication. Order service will return a response after a successful request:

```
{
  "orderId": "1"
}
```

[copy](<javascript:void(0)>)

This is very simple response, but in the upcoming chapters we will see advanced scenarios, and proper exception handling mechanisms. Also, we will see inter-service communication in Chapter 5, grpcurl is to show how to call gRPC from your local environment quickly.

Tour livebook

Take our tour and find out more about liveBook's features:

- Search - full text search of all our books
- Discussions - ask questions and interact with other readers in the discussion forum.
- Highlight, annotate, or bookmark.

take the tour

## 4.3 Summary

- Hexagonal architecture helps you isolate layers in your microservice to implement testable and clean applications.
- Ports are for defining contracts between layers, while Adapters are the concrete implementations that can be plugged into ports to make the core application available to the end user.
- It helps a lot to start implementing the application core first and then continue with outer layers.
- Gorm is an Object Relational Mapping library for Go with a good abstraction for database related operations.
- Twelve-Factor Applications has a good use-case for microservices that application configurations can be passed through environment variables, and you can configure them based on the environment.
- Combining layers in hexagonal architecture is done by using dependency injection.
- _grpcurl_ provides a curl-like behavior to handle order data by calling gRPC endpoints.

[sitemap](https://livebook.manning.com/book/grpc-microwervices-in-go/chapter-4/v-2/sitemap.html)


