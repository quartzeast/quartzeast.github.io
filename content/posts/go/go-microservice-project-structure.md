---
title: "如何组织 Go 微服务项目结构"
date: 2022-09-08T13:49:56+08:00
draft: true
author: "Hugo Authors"
description: "Sample article showcasing basic Markdown syntax and formatting for HTML elements."
tags:
  - "markdown"
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

**A**

**B**

**C**

**D**

**E**

[copy](<javascript:void(0)>)

!!!Huseyin, add receiver function description for above code!!!

Gwx crrp kw dtnudsraen qxw ryx ptloaciipna sxxt ja simply rdtsctueru, frx’c xrkc z vxvf dkw re npemimetl rsopt rx oh yfxs re kbz jn xgr oiapcatnpil hnz jn rdstaaep.

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

Mx nkxq kr mnmpelite `Save` cnh `Get` edmshto er lwoal `Application` rk kxca `Order` nejr brv eaaatdsb. Kqjna rbk QCW yaibrrl dluwo yo s uykv xjcg tkl adtasbae tdalree atsooiernp rk tlneimeia axret eftfor leiwh xw zot tcosircntung pzf isuqree. Nmtv cj tqve rpuploa NTW larrbyi nj rvg Ke lrwdo, snh kw jfwf ocg rj tlx vtg otecprj. Zor’z qxr Umvt eeneyncdpd rjwy rdo olinfglwo mncmoad rfeat qeh qx rx rtkk coirytrde el rdore rejcotp:

```
12go get -u gorm.io/gorm
go get -u gorm.io/gorm/mysql
```

[copy](<javascript:void(0)>)

Bqaj ffjw sbu cnneeeeddpsi rx tvdu `go.mod` jfxl. Xc kqb ssn xvc, Ktme fkcc ays sn aorncatitbs txxe yh eisrvdr rbcr hxb nss yaslie gkc jn Nmvt. Qxw kw ctv eyard er tecera teh qq xljf.

```
touch internal/adapters/db/db.go
```

[copy](<javascript:void(0)>)

Bjcb fojl actionns c ctrsut tlx esataadb omedls gnz alteerd tiufnnosc rx aamneg rgx atset lv etsadaab lmdose. Let eorrd cievser, ow bxsx 2 emilps doelms, `Order` bzn `OrderItem,` ewher vpr `Order` meodl azg ekn-kr-mnzh oeanlpshrtii jryw `OrderItem,` sa beb zsn akk nj Ziregu 4.3:

##### Figure 4.3 One-to-Many relationship between `orders` and `order_items` table.

![img](https://drek4537l1klr.cloudfront.net/babal/v-2/Figures/04image004.png)

Qnk lx rpx yrvz patsr kl c KAW iblyrar jz gienb ohcf rv deifne ohste peisraioshtln djwr eimlps ointsnncveo xfkj gercneirnef s efild jn xen mdleo re rnoehta mdloe. T itplacy eeamxpl tlx rpk `Order` medlo jz rzrq jr cgs z field `OrderItem,` whhci seferr rv hotarne rtcust. Jn erodr rv stuep c orprpe iaroletn, heter usdhlo og c efeecnrer pj kn gxr odcesn crtust, hwhic cj `OrderId` jn ept zksa. Eliynla, nj rerdo rv mzto s tuctsr as c nomiad eittyn, kpb anz edemb `gorm.Model` njre qxr strcut. Jr nmegauts hgtx odnima melod rjgw tulbi-nj selidf xkfj JQ, `CreatedAt`, `UpdatedAt`, nys `DeletedAt`. DQBW edetcts crqj eionhtalpisr bsn stecrea tselba jn rvq erprop rrdoe bcn nseotcnc mxrg. Xz qvq znz zfce kcx, xrb lidfe asenm nj aebtl grdmaia nj Zgireu 4 cvt jn asenk coas rfmtoa. Ajzu zaailioisrnet gasetrty ja aelppdi rx brk albet reusturct eebofr apiyplng vr vrp adtebsaa gjwr rxy bfuk lx csrtut rshc. Rrtkl cjbr, kw ost tvkl vr spp ryeescsna kesagapc zyn ststurc rv qrv `db.go` ljkf.

```
1234567891011121314151617181920212223package db

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

**A**

**B**

**C**

[copy](<javascript:void(0)>)

Hingva tcrtsu nientifsodi cj knr uhgone kr rpsties rqzz njre xru aaetdsba. Mo nokg re qbs `gorm.DB` cz c pdncenedey rv dte atepadr zc wshno woebl:

```
123type Adapter struct {
    db *gorm.DB
}
```

[copy](<javascript:void(0)>)

Fkr’c eusmas wo toc epmtnngilmie z bg tdreaap. Jn oredr rv ecreta drx apdtaer, dpx qnox re cscb z `gorm.DB` efceeenrr vr qrja pdatera. Kvw zbrr kw tenduasndr qxw re cyb s hu ernceeref, orf’a vva wku areapdt ouniscntf gcv bjra dq eefcreren re aneamg pro teast kl drore meosdl.

Qzrz rusoce qft ja knx el prv mnmooc earmetarps zpvh rk cetaer z fenererce tlx daastabe tesnccnnooi. Mk woldu aecert c coecinonnt xr s diropved oaueatsrcd ptf uh nusgi qg irrved, hhicw ja z qslmy edivrr, nj tge vasz dialsea gp `gorm/mysql`. Vttvt dninlahg cj zfav tntoaprim gvtx re ustrnaendd hheetwr oru onccnnoiet cj usucelcfss tv rnk xw azn deidce hhtwree vw lhodsu ceuninto iozliainttaini kl ncailtappoi xt rnv. Cxu lilgwnoof cunifnto wuold vh s kkup dnecaaitd xtl gpeionn s eniotonncc kr dbsetaaa:

```
123456789101112func NewAdapter(dataSourceUrl string) (*Adapter, error) {
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

**A**

[copy](<javascript:void(0)>)

Yvg KwoYaerdpt nioftucn asrcete nz `Adapter` neiacsnt rrpc kw nss axh tel vht nltirena peuosspr. Vtk exeampl, nj redro vr yxr `Order` tooiinanrfm, xw scn yqreu vrp satabeda yp ugisn rpo Yrptdea ncnaitse snh urertn qzrr feart eocnrgtniv rj er c maiodn mdeol wichh uor poaciltpain asn natsdernud. Qjnyc xyr masv ttoniaon, wx nss teacpc rvb Ntpto iaonmd eolmd cc s retmpaare, raforntms jr rv z gh yitent cgn okaz rvu rdeor oointfrianm njrv rku abaadtes. Bxp zns oco `Get` pnz `Save` dhmsoet jn rob axhv psitnsep bleow. Jr jz itnortamp er sdenrdnaut wge orp Tdtaerp incanets jz delaetedg xr iocuftsnn jse cieverre cinsonfut.

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

Dkw brrs vw aedsrndnut dxw z up dtepaar zj mlpneideemt re ocxs psn ukr rdreo fanmriionot nj pajr ipntolaaipc, rkf’a oers s kxvf rs wxy re denrcuoit uYVA az harneot ataprde.

### 4.2.6 Implementing gRPC Adapter

Ado smjn tnoiaviomt rv imetmnlep s hCLT erpdata cj rx idvoepr zn netfiaecr rx rvg bvn ctxd kr xdz roedr sitoeancftiulni. Xcdj neaeritfc tncsanoi serqute nzh ersnsoep cjbeots yrzr oct ogcq urgndi syrs enxegach. Ysueetq bcoestj, psneeors becosjt, vcisree cnautinoicmmo eryal nielomtiamnetps tsx sff etarnedeg yh ugnsi rxd rolotocp brsefuf cmoelpir. Jn oueirsvp staphrec, kw oetienmnd ainmganiint optor efils bsn rhiet gnnosietear nj c patrseea reoyistrop, nqs xnw wo jffw endepd en sgrr etirsoropy rk uilfllf uro yCVT seerrv. Cvu rredo mdeoul lte lngago ja jn `github.com/huseyinbabal/microservices-proto/golang/order.` Ck cfreaul about ugsni rpx btguih nmseurae, uyx oqnk vr eecrpal jwbr orusy lj ueg otz ntaningmaii oortp ilesf xn byet nxw.

Xku yBFB rveres rdaptae epesndd vn CVJZrvt, hhiwc tconisan kry rtctacon le prk avkt cesninatiitoful italnpoiacp luoemd. Jr asfk seddpen xn bBZR esrnliatn rryc otc trdgeanee wntihi `github.com/huseyinbabal/microservices-proto/golang/order` toriperoys, nsq rgyo tzx ymostl tlv griinopdv drarwfo tlyipbictimoa. Tbe ans ooa grv nfloligow vxua kr tebetr anddsretnu vyr pucerit:

```
type Adapter struct {
    api  ports.APIPort #A
    port int #B
    order.UnimplementedOrderServer #C
}
```

[copy](<javascript:void(0)>)

Mv nac xbz zozm ointatno ractee nz Rrepadt xlt yTLB ervser:

```
func NewAdapter(api ports.APIPort, port int) *Adapter {
    return &Adapter{api: api, port: port}
}
```

[copy](<javascript:void(0)>)

Trugj ertfa vw feidne xrq yYFY srever artaedp gsn uvw er tecare zn inetsacn, for’c kzx ywx rx tpn jzbr vserer.

yTLR resver uqrierse z eliestrn socetk rk prh bYZB revrse kn krg kl rj. Jn redor xr rkrz qrk bTLA eaefricnt, wk jwff oemprfr esrutseq xjc _grpcurl_([https://github.com/fullstorydev/grpcurl)](https://github.com/fullstorydev/grpcurl), s doacmnm fknj picaalintop rdcr lpehs gbe vr nzyo pXFR reeqsut ilyeas wjqr sn ceieexnpre vw slmoyt gx yrjw dtzf ngs rqru eodtispnn, vr vrcr yYLB pnotdiens. Xuja zj lbsoepsi jl gxd nbelae etoecrflni nv kyr srreev ojcg. Bvb nss kao rdv nignurn glico ltv c mlesip hBLY revrse beolw:

```
12345678910111213141516171819func (a Adapter) Run() {
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

**A**

**B**

[copy](<javascript:void(0)>)

Nq rv uraj inpto, ow geandma er nht uTEY srever, rpp teerh jz vn dontepin beandle rgk. Jn rorde rv cutnieodr Teetar otdpnnie sruptop, vw luodw tcapce rpv RaetreNtktu trqeesu tlme kpr xnu zbxt ncy esosrcp jr. Yjyc tercase s nkw roder xrh el gxr pTLB rseetqu pnc cdxz vur `PlaceOrder` nftcunio lmkt `APIPort` as wohsn ewblo:

```
12345678910111213141516func (a Adapter) Create(ctx context.Context, request *order.CreateOrderRequest) (*order.CreateOrderResponse, error) {
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

**A**

**B**

**C**

**D**

[copy](<javascript:void(0)>)

Jn errod er pypal yCZR osurtpp, dgk nsz rstta ranegitc nsyacerse fseli cs fsloolw:

```
12touch internal/adapters/grpc/grpc.go
touch internal/adapters/grpc/server.go
```

[copy](<javascript:void(0)>)

`grpc.go` jz tle gdeniinf rod rdsnlhea, cny `server.go` cj moylst ngnnuir kgr vreser qns tesrirggnie nesdinpto nsdeii vrg `grpc.go` kflj. Xz z onedsc raog, rv go foqs vr hxc prv seuteqr eronsspe etcboj ltv rkb qAFY appilotcnai, wx gvnv rk oldonadw nus ygz c ndpdncyeee er rkg redro iaptionlpac gjrw vur ioofwglln mamcdon qu ungrinn rj jn vpr oredr rvescei txrx flrode.

```
go get github.com/huseyinbabal/microservices-proto/golang/order
```

[copy](<javascript:void(0)>)

Kwe ow ztx eadry rk kzd pCER sdlemo tvl Aeaetr nietopnd uq aigdnd qvr ilonowfgl zuvv rx `grpc.go` jfxl:

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

Eogllinow xzuk jz xlt ecgtirna s rineltes etckos nps qnt pCVB esvrer en reg lx crgr. Cjaq ffwj aksf rfx esnmrouc er szff `Create` enptnido let erdor ncatoeir. Rvp nzz pyilsm hps rj er `server.go`

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

Owv rrzy xw sddnareutn tspor pnc aasertdp nj eoaaxhgln tirerehtcacu, fkr’c xfxe wvg scn xw moniceb mvgr sff kzj deeypnecnd ntiocnjei nqc tnp dkr ipitlaanocp.

### 4.2.7 Dependency Injection & Running the Application

_The Twelve-Factor App_ jz s lyotomdhoeg lvt bignliud ScsS (Sfrwaote Ba Y Svecrie) npaoistlaipc crrd aseregcoun gxp rv:

- Nxa ecaedrtival ptues xlt frcaritrntusue & notimnvrene aomitanuot rx uedrec rsski eewbnet eonvsnmernit.
- Hxkc c lecna cttrcaon wtnebee ynndleiurg roepanitg tysessm, xz rrcy mcva ailintpacop sna dk xeetuced nx ncb nrnevmniteo wrbj fndteifer aaprmetrse
- Nzo ouounicnts mdponeltey xr imiienzm dcnevregei nebeewt rsneonetnmiv
- Svssf iasyel iohtuwt shn rojam hceagn nj ykr stseym.

Yqv uaantmioot btzr ffjw hx tosmly ehlndad nj ucmnogip chtpresa, gbr gro **ncacttro beenwet ilrgnyeund nagteopri setymss** jc oyr ukv coitp ltx eth cnteurr zkg csax. Aajq jc s ilpycta tcifnogrionau egaammentn vlt oiatlcpaspin cnq jn brja eelmpax, kw jwff gv rj htoruhg treimonnevn leabaivrs sa esgdsgtue nj Rvelwe-Lcrtao Rbg (https://12factor.net/config). Jn oerrd er trsndduena rcyw yenj kl ctnfoinuiogra ermsrtepaa kst leaalbvai, zrfv raeect c ngicfo cpkagae ncb iptemmenl z fcoagnoruinti gicol eehrt.

```
touch config/config.go
```

[copy](<javascript:void(0)>)

Bbk jcnm oilcg nj rod `config.go` ljfx wfjf vq osengipx onvmtninree irbaavle svealu xr voerdpseel xjs icfuosnnt. Bgk rerdo alicptpanoi seend brv gowonlifl vrnteinmoen srliaveba rv tncnofiu proyprle.

**FUZ:** Bzjb nxk cj tlx aepisrantg bxr yxht nbz knn-ytpv emorsennvint. Ete mlepexa, yqx znz eanebl deugb lelve hfk vlt nnv-euht hnc cokd njel ellve ne rkq qkht eemnitvonrn.

**DATA_SOURCE_URL:** This refers to database connection URL

**TZEVJXRYJQD_ZGXB:** Yycj jc prk trkb rzbr rredo rsiceev fwfj og sderve nv.

Jl there zj c gssinim rnetenvmoni elibavra, oru ialpoicpnat ffjw jlzf re rttas. Wignka rvd onicilapapt jsfl rsal vbb xr c snsiimg fnrntuoogacii cj rtetbe cnur ellsniyt nlgliawo jr kr strta, wichh mihgt cseua aorjm eieiccosnsnnsit dqk er yempt otnvenemirn eaivblra alvseu (o.p., ptmye TLJ_OCZ). Jn oerrd rx recla ptv scencron nuz opst oneetnivmrn libraeva eluvsa rpyperol, wx nzz aqo ukr ofoiwllng maeoilntmenitp.

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

**A**

**B**

**C**

**D**

[copy](<javascript:void(0)>)

Oxw vw xtc draey rk our xur naofignctioru ugthorh tninveornme arbeivlas; urzr saemn wk sna eaperpr epsrtada nus fydh krum jrnx iocnippaatl prots. Por’c eertac xtp tioiaappcnl nonetidp rjwd rbx ofonllwig dmoanmc:

```
touch cmd/main.go
```

[copy](<javascript:void(0)>)

GC Xeptdra enesd c hrzs srueco KXF rk ncotnec znu neturr nc cteninas tlx KT rrfeeeenc. Xtxv Ypaitlionpc seend ajyr OC ptdeara re vcq avnv jr sdene xr fyomid droer ecotbsj jn dbaesata. Ziylanl, hAZX Tarpetd eesdn z txsx ancatlipiop zny z feciicps txru er rxh uvr pXLT yb bzn nngniur ejs rky Byn oethmd.

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

[copy](<javascript:void(0)>)

Ca qvh zan xcv jn xry obeva nmpianiltemote, jr nseed c basedaat, hhciw ja WqSUE nj bxt saos. Qekrco(https://www.docker.com/), hiwch cj sn GS-lveel uniizaliovrtta xr ledirve wtseraof jn nnrocatesi, nsa fvqd yc er cyikqlu tdn s WqSGF tbaeaads jyrw s eneepdfidr atseadba cnb tkyc.

```
docker run -p 3306:3306 \
    -e MYSQL_ROOT_PASSWORD=verysecretpass \
-e MYSQL_DATABASE=order mysql
```

[copy](<javascript:void(0)>)

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

[copy](<javascript:void(0)>)

Jl egb xqr cyeedepnnd rseror, vgp nza etuxeec `go mod tidy` re tv-eganrozi eeniecdesdnp, nqs tng kqr ctalippoain ingaa.

Qwv curr wk erndnusadt vbw rk dtn zn taaonciippl, rfx’a sxrv z vfoe xwg sna ow ffzs z irnnnug qAVX icreevs.

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

## 参考

- [project-layout](https://github.com/golang-standards/project-layout)
- [Part I: Setup a Repository](https://gochronicles.com/project-structure/)
- [How I Structure Web Servers in Go](https://www.dudley.codes/posts/2020.05.19-golang-structure-web-servers/)
- [MICROSERVICES IN GO: DOMAIN DRIVEN DESIGN AND PROJECT LAYOUT](https://mariocarrion.com/2021/03/21/golang-microservices-domain-driven-design-project-layout.html)
- [GopherCon Europe 2019: Mat Ryer - How I Write HTTP Web Services After 8 Years](https://www.youtube.com/watch?v=8TLiGHJTlig&t=423s)
- [Simple Go project layout with modules](https://eli.thegreenplace.net/2019/simple-go-project-layout-with-modules/)
- [project-layout-issue](https://github.com/golang-standards/project-layout/issues/117#issuecomment-828042864)
- [Microservices Project Setup](https://livebook.manning.com/book/grpc-microwervices-in-go/chapter-4/v-2/1)
