---
# You can also start simply with 'default'
theme: dracula
# some information about your slides (markdown enabled)
title: ChainPress
info: |
  A decentralized content publishing platform for Web3
# apply unocss classes to the current slide
# class: text-center
# https://sli.dev/features/drawing
drawings:
  persist: false
# slide transition: https://sli.dev/guide/animations.html#slide-transitions
transition: slide-left
# enable MDC Syntax: https://sli.dev/features/mdc
mdc: true
# open graph
# seoMeta:
#  ogImage: https://cover.sli.dev
---

# ChainPress

a **censorship-resistant**, **verifiable** journalism platform.
<!--
The last comment block of each slide will be treated as slide notes. It will be visible and editable in Presenter Mode along with the slide. [Read more in the docs](https://sli.dev/guide/syntax.html#notes)
-->

---
layout: two-cols-header
layoutClass: gap-16
---

# dream about free speech, reliability, and independence

::left::
![img](./img/image1.png)
![img](./img/image3.png)

::right::

![img](./img/image2.png)
![img](./img/image4.png)

<!--
Here is another comment.
-->

---
transition: slide-up
level: 2
---

# so i proposed:
```mermaid
mindmap
  root((ChainPress))
    Immutable
      Prevents censorship
      Prevents takedowns
    Pseudonymous
      Ensures free speech
      Prevents doxing
      Verified actors
    Decentralized
      Ensures reliability
      Ensures independence
      Content distribution
      Reputation system
    Transparent
      Ensures trust
      Enables accountability
    Incentives
      Rewards for quality content
      Fact-checking bounties
      Reader support mechanisms
      Sustainable journalism model
```

---
transition: slide-up
level: 2
---

# with business cases:

1. public permissionless blockchain
2. decentralized storage
3. enable organization
4. enable anonymous whistleblowing

---

# the architecture:

```mermaid
flowchart LR
  %% Frontend Layer
  subgraph Frontend
    User[User/Journalist]
    Reader[Reader]
    WebUI[Web Frontend]
    User --> WebUI
    Reader --> WebUI
    WebUI <--> Wallet[Web3 Wallet]
  end
  
  %% Backend Layer
  subgraph Backend
    IndexLayer[Indexing & Query Layer]
    WebUI <--> IndexLayer
    IndexLayer <--> Storage[Decentralized Storage]
    
    subgraph Storage
      IPFS[IPFS]
      Arweave[Arweave]
    end
  end
  
  %% Oracle Layer
  subgraph Oracle
    DataFeeds[External Data Feeds]
    VerificationSystem[Content Verification]
  end
  
  %% Blockchain Layer
  subgraph Blockchain
    SmartContracts[Smart Contracts]
    TokenSystem[Token System]
    ReputationSystem[Reputation System]
  end
  
  %% Connections between layers
  Wallet <--> Blockchain
  IndexLayer <--> Oracle
  Oracle <--> Blockchain
  Backend <--> Blockchain
```



