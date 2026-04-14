

| ![][image1] | Jagannath International Management School Vasant Kunj, New Delhi-110070 (Affiliated to Guru Gobind Singh Indraprastha University, New Delhi) Recognized u/s 2(f) by UGC & Accredited with ‘A+’ Grade by NAAC NIRF Rank Band 201-300 under College Category Participant of UNGC New York and ISO 9001:2015 Quality Certified |
| :---- | :---: |

**A**  
**Synopsis Report**  
**On**

**“RentEase: Digital Rental Agreement &**  
**Tenant Management System”**

For Partial fulfillment of Bachelor of Computer Application  
(BCA 2023-2026)

![][image1]

|  Submitted to Mrs. Abha Pandey Assistant Professor – IT Department JIMS, Vasant Kunj |  Submitted by Yuvraj Singh Raghav Bhardwaj |
| :---- | ----- |

**MARCH, 2026**

**TABLE OF CONTENTS**

| S. No. | Topic | Page No. |
| :---: | ----- | :---: |
| 1\. | Introduction | 3 |
| 2\. | Why Was This Topic Chosen? | 4 |
| 3\. | Objectives and Scope | 5 |
| 4\. | Methodology | 6 |
| 5\. | Technology Stack | 7 |
| 6\. | Testing Technologies Used | 8 |
| 7\. | Limitations and Future Scope | 9 |
| 8\. | Team Work Distribution | 10 |
| 9\. | Conclusion | 11 |

# **1\. INTRODUCTION**

Renting out a flat sounds simple. You find someone, get an agreement signed, collect rent each month. But the small things pile up fast. The signed copy is in a drawer somewhere. A tenant messages about a water leak at 11 PM. The rent for March came in but no one wrote it down. Six months later there is a dispute about whether a particular clause was ever discussed. None of this is a single big problem. Together it makes the whole thing harder than it needs to be.

We noticed this pattern when we were thinking about what project to build. Most landlords managing one or two properties in India are not using software. They are using WhatsApp, printed agreements, and their own memory. It works, until it does not. A missed reminder, a lost document, a complaint that fell through the cracks. We thought there was something worth building here, something simple that a regular landlord could actually use without any training.

## **1.1 Problem Statement**

When we sat down to map out what the actual problems were, we split them by who is affected:

Problems faced by landlords:

**1\.** Paper agreements get lost or damaged. There is no easy way to pull up what was signed two years ago.

**2\.** Keeping track of which tenants have paid and which have not, especially across two or three properties, is genuinely hard without a system.

**3\.** Sending rent reminders manually every month is awkward, and many landlords just skip it to avoid seeming pushy.

**4\.** Maintenance complaints come in over WhatsApp. They get buried, forgotten, or never properly resolved.

**5\.** There is no single place to see all tenants, all properties, and all pending issues at once.

Problems faced by tenants:

**1\.** Tenants rarely get a copy of their own agreement and have to ask the landlord every time they need to check something.

**2\.** The legal wording in most agreements is confusing and most tenants just sign without really understanding it.

**3\.** When a complaint is raised, there is no way to know if it was seen or if anything is being done.

RentEase is what we built to deal with these. It is a web app where a landlord can log in, add their properties, store tenant details, generate a rental agreement, track payments month by month, and log maintenance complaints. There is also a small AI assistant built on the Gemini API that can read an agreement and explain what any clause actually means. We kept the scope tight because we are not advanced programmers and we wanted to actually finish what we started.

# **2\. WHY WAS THIS TOPIC CHOSEN?**

The idea did not come from research or a list of trending project ideas. It came from a real conversation. Yuvraj has a relative who manages two flats and handles everything through paper and phone calls. A few months back there was a dispute with a tenant about whether a lock-in period clause was part of the original agreement. No one could find the signed copy quickly. The conversation dragged on for days over something that should have taken five minutes to resolve. That story stuck with us and when we sat down to pick a project topic, it felt like the obvious choice. We were not solving a hypothetical problem.

## **2.1 Why Existing Apps Did Not Work for This**

We looked at a few property management tools before deciding to build our own. Most of them, like NoBroker for owners or similar platforms, are aimed at people managing larger portfolios or using agents. They have things like commission tracking, bulk invoicing, and multi-user dashboards. None of that is needed if you have two flats. The simpler apps we found were basically just digital ledgers. They let you track payments but had no agreement features, no complaint management, nothing for the AI part we wanted to add. There was a gap between too complex and too basic, and we decided to build something that sits in that gap.

## **2.2 Why the AI Part Made Sense**

Rental agreements in India are almost always written in legal language. Clauses about lock-in periods, notice periods, and maintenance responsibilities are not hard concepts, but the way they are written makes people feel like they need a lawyer just to understand what they signed. We thought if we could build something that lets a landlord or tenant just ask a plain question about their agreement and get a plain answer back, that would actually be useful. It is not a complex AI application. It is a practical one. The Gemini API made this possible without us needing to train anything or set up complex infrastructure.

## **2.3 What We Wanted to Get Out of This Project**

Both of us wanted to try Firebase as a real backend, not just in a tutorial. Raghav had watched a few YouTube series on it but had never used it in a project with actual linked data across multiple collections. We also wanted to try working with an AI API for the first time, which we had not done before. On top of that, none of us had built something that another person would actually use. That last part was honestly the biggest motivator. Building something real, even if small, felt different from building something just to submit and forget.

# **3\. OBJECTIVES AND SCOPE**

Here is what we set out to build:

**1\.** A digital agreement generator — landlord fills in the property address, tenant name, rent amount, lock-in period, and other standard terms, and the system produces a formatted agreement that can be downloaded or shared.

**2\.** A tenant profile for each property — stores the tenant's contact details, ID document, move-in date, and links it to their agreement and payment history.

**3\.** A monthly rent tracker — the landlord can mark each month as paid or pending and see the full payment history for each tenant without digging through messages.

**4\.** Automatic rent reminders — the system sends a notification when a due date is coming up so the landlord does not have to remember to send it manually.

**5\.** A maintenance complaint log — tenants can submit a complaint and landlords can update the status. Both sides can see where things stand at any point.

**6\.** An AI clause explainer — a user pastes any part of their agreement and asks a question about it. The Gemini API reads the text and gives a plain-language answer.

**7\.** A property dashboard — one screen showing all the landlord's properties, current tenants, payment status this month, and any open maintenance issues.

## **3.1 Scope**

RentEase is for small residential landlords with two or three properties. One landlord account, multiple properties, one active tenant per property at a time. The agreement templates cover standard residential rental terms: rent amount, deposit, lock-in period, notice period, and basic maintenance clauses. The AI assistant reads the agreement text and answers questions about it. All data is stored in Firestore, linked by document IDs.

We deliberately left some things out. There is no tenant-side login in this version, so all entries are made by the landlord. There is no payment gateway, meaning the landlord marks payments manually after money is received. The agreements the system generates are not legally stamped, they still need to be printed and signed. Commercial properties, multiple tenants per unit, and revenue-sharing leases are out of scope. We made these calls early on so we could actually finish rather than build half of a much bigger system.

# **4\. METHODOLOGY**

No formal methodology. We made a rough feature list, agreed on an order to build them, and worked through it one piece at a time. We used Claude AI and GitHub Copilot for code suggestions throughout — we are being upfront about that because it is just how we worked.

## **4.1 Phase 1: Requirement Gathering**

We started by just writing down everything that annoyed the person who had inspired the project in the first place. Yuvraj spent a weekend asking his relative specific questions, like what takes the most time, what has caused disputes, what gets forgotten. That gave us a list of about fifteen pain points. We then went through them and grouped the ones that could be solved by a web app feature. That list became the first version of our objectives. We also installed two property management apps and went through them screen by screen to see what features they had that we might want to include or avoid.

## **4.2 Phase 2: System Design**

Before touching any code, we drew out the Firestore structure on paper. We had six collections: landlords, properties, tenants, agreements, payments, and complaints. Each tenant document stores the property ID it belongs to and a reference to the agreement ID. That way we could pull up everything related to one tenant in a single query without duplicating data across collections. Raghav sketched a flow showing the steps a landlord would take from first login to generating an agreement. We also drew rough wireframes for the five main screens on paper. Nothing fancy, just boxes and labels, but it helped us agree on what went where before we started building.

## **4.3 Phase 3: Development**

We built it in order. Login and authentication first, then property creation, then tenant profiles, then agreements, then payments, then complaints, then the AI features last. Each piece was tested before we moved on. The agreement generator was the most time-consuming part because the form had a lot of fields and we kept redesigning how they were laid out. The AI integration was the most unpredictable. We did not expect the prompt engineering to take as long as it did. Early versions of the Gemini prompt would summarize the wrong clause or start answering questions that were not asked. We went through maybe nine or ten versions before it started behaving consistently.

## **4.4 Phase 4: Testing and Deployment**

Testing was manual throughout. One person would act as a landlord and go through the full workflow while the other two watched and wrote down what looked off. We used a separate Firebase project for testing so nothing we broke during testing affected the version we were planning to submit. Once we were happy with the result, Raghav ran the deployment to Firebase Hosting. We kept the main GitHub branch clean and only merged to it when a feature was finished and tested. That saved us from a few situations where one person's changes would have broken what the other two had built.

# **5\. TECHNOLOGY STACK**

Our main criteria when picking tools were that they had to be free, had to have enough documentation that we could figure things out ourselves, and had to be simple enough that we were not spending more time setting up the environment than actually building. Below is what we used and why each one was chosen.

## **5.1 Frontend**

* HTML5 and CSS3: The whole structure and base styling is in plain HTML and CSS. We did not use any build tools or preprocessors because that added complexity we did not need.

* Bootstrap 5: We used Bootstrap for layout and components. Cards, modals, forms, and the navigation bar all come from Bootstrap. Writing all of that from scratch would have taken far more time and the result would have looked worse.

* Vanilla JavaScript: All the logic on the client side is in plain JavaScript. We considered React but decided against it. None of us knew it well enough to use it properly under time pressure, and plain JavaScript turned out to be enough for what we needed.

## **5.2 Backend and Hosting**

* Firebase Studio: Our main backend environment. Firebase Studio let us manage authentication, database, storage, and hosting from one place without setting up a separate server.

* Firebase Authentication: We used email and password login. It was the easiest option to set up and covered what we needed, which was just keeping each landlord's data separate and secure.

* Firebase Hosting: Where the app is deployed. One command to deploy after building. No configuration needed beyond the initial setup.

## **5.3 Database**

* Firebase Firestore: Our main database for all app data, structured across six collections. The document-reference model in Firestore matched our data structure well once we sorted out how to link collections properly.

* Firebase Storage: Used only for tenant document uploads, like ID proof photos. Files are stored here and the download URL is saved in the corresponding Firestore document.

## **5.4 AI Integration**

* Google Gemini API (gemini-1.5-flash): We used this for the clause explainer and the agreement summary features. The flash model was fast and stayed within the free tier limits for our usage. Getting it to give useful, grounded answers took a lot of prompt iteration.

## **5.5 Version Control**

* GitHub: Both of us pushed to a shared repository. We used feature branches so changes to one part of the code did not interfere with what the others were building at the same time.

# **6\. TESTING TECHNOLOGIES USED**

No automated testing framework. Everything was manual. We know that is not the textbook answer, but for a project at this scale, manual testing caught everything that needed catching. The two of us walked through the full landlord workflow multiple times. We also brought in two classmates from outside the team to test it blind, which turned out to be one of the more useful decisions we made.

## **6.1 Functional Testing**

For each feature we ran through specific scenarios. With the agreement generator, we tested what happens if a field is left blank and whether the date updates correctly when re-generated. For the payment tracker, we marked February paid, then March unpaid, then went back and flipped February too, just to make sure the history stayed accurate. For the AI clause explainer, we pasted in the lock-in clause and asked three questions. Two answers were good. The third added something that was not in the clause, which told us the prompt still needed more work.

## **6.2 Integration Testing**

The worst bug was in the agreement-to-database link. The first version constructed the Firestore document path using the tenant's display name as a key. If the name had a space or special character, it either broke or created a duplicate. It took about two days to fix — we had to trace where the document ID was being set and switch to the Firestore auto-generated ID throughout. After that, the linking worked cleanly.

## **6.3 Usability Testing**

We gave the app to two classmates and told them to add a property, a tenant, and generate an agreement without us explaining anything. Both hit the same wall — the add-property button was labeled 'New Entry' from development and we had never changed it. We renamed it and moved it somewhere more visible. One tester also pointed out there was no confirmation after submitting a complaint, so we added a toast notification. Small fixes, but both made the flow feel more complete.

## **6.4 Security Testing**

We wrote Firestore rules so each landlord can only read and write their own data. To test it we created two accounts and tried to access Account B's data from Account A. The request was blocked. We also confirmed that unauthenticated requests return permission errors. The rules are simple but they cover the main case.

# **7\. LIMITATIONS AND FUTURE SCOPE**

## **7.1 Limitations**

We want to be clear about what RentEase does not do right now, rather than leaving anyone to discover it after the fact.

* No tenant login. Everything goes through the landlord's account. A tenant cannot log in to see their own agreement, payment history, or complaints. The landlord manages all of it.

* No payment processing. Payments are logged manually by the landlord. The app does not connect to any bank or UPI system. If a tenant pays, the landlord has to open the app and mark it.

* The agreements are not legally stamped. They are formatted templates. For any legal purpose, the agreement still needs to be printed, signed, and ideally registered. The app does not handle any of that.

* The AI assistant needs internet to work. There is no offline fallback. If the Gemini API call fails, the clause explainer and summary generator just show an error and nothing else happens.

* One landlord account per setup, no team or agency features. There is no way to add a second person to manage the same properties. It was built for a single individual, not a shared setup.

## **7.2 Future Scope**

Given more time and better skills, here is what we would build next:

* A tenant-side login so tenants can see their agreement, mark when they have transferred rent, and raise complaints directly instead of having to contact the landlord first.

* A payment link feature, something like a Razorpay or PayU integration, so rent can be collected online and automatically marked as paid in the tracker.

* More agreement template types to cover leave-and-licence agreements, which are very common in cities like Mumbai, and commercial rentals.

* A mobile app, probably built with React Native, so landlords can update records from their phone without opening a browser.

* Offline mode with background sync so the app can be used in areas with poor connectivity and syncs to Firebase when the connection comes back.

# **8\. TEAM WORK DISTRIBUTION**

We split the work based on comfort and interest, though we helped each other more than expected. Here is how it broke down:

## **8.1 Yuvraj Singh – Frontend**

Yuvraj built most of what you can see in the app. The dashboard, property cards, tenant profile view, agreement display page, and complaint log screen. He handled all the Bootstrap layout and making things look decent on both laptop and mobile. The agreement generator gave him the most trouble — too many fields, kept feeling cluttered, he redesigned it three times. He also had to figure out Firebase Storage for document uploads, which was new for him. That part took longer than planned.

## **8.2 Raghav Bhardwaj – Backend, AI & Testing**

Raghav set up the Firebase project, structured the Firestore collections, and wrote the JavaScript that talks to the database. He also handled the Gemini API integration, which turned out to be the most unpredictable part of the whole thing. Early prompt versions were messy. The AI would summarize the wrong clause or add details that were not in the text. Raghav went through around nine or ten versions before it started behaving. He also ran most of the testing, kept a log of bugs and usability issues, set up the Firestore security rules, wrote the project documentation, and handled the final deployment to Firebase Hosting.

## **8.3 Work We Did Together**

Both of us worked on the initial requirement gathering, the database structure, and the final integration testing before the deadline. The integration testing sessions were the most productive time we had on the project. Working through every connected feature in the same room caught things that neither of us had noticed alone. We also decided together what to cut from the feature list when we realized the original scope was bigger than we could finish. That call was not easy, but it was the right one.

# **9\. CONCLUSION**

We built RentEase because the problem it solves is real and close to us. Small landlords in India are managing properties through a mix of paper, phone calls, and WhatsApp, and that system breaks down in predictable ways. Lost agreements. Forgotten payments. Unresolved complaints. We wanted to see if we could replace that with something simple enough that a non-technical landlord could actually use it.

What we delivered is a working web app. A landlord can log in, add properties, create tenant profiles with document uploads, generate a formatted rental agreement, track monthly payments, log and update maintenance complaints, and use an AI assistant to get plain-language explanations of agreement clauses. It is all connected through Firebase and deployed on Firebase Hosting. We built it, we tested it, it works.

Both of us are clear about what it is not. No tenant portal, no payment gateway, no legally stamped agreements. Those are real gaps and we have listed them honestly. But within the scope we set for ourselves, it works.

The biggest thing we both learned was around integrating different services together. Getting Firebase, the frontend, and the Gemini API to work correctly as one system was harder than any individual part. When the agreement generation broke during integration testing, finding the cause took longer than fixing it. We tried to build something useful. We think we did.

**\* \* \* End of Synopsis \* \* \***

[image1]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAFwAAAA8CAYAAADrG90CAAAIRElEQVR4Xu1aa2wUVRgdY3wQKAQFSklM/OEfElEe5VWogBgwBKEGhcizPoOKGhP94QuJ/ABEq7Gl2kJpi1jeUHnYYgFbkNqWSmsrFEofFlZLUQoUNCZa1/vt9m6/PXNnprO7RaP3JCczc7/zfffO2buzc2fHMK4T7h32kRfbNLoR9wjDW1u9fbBdoxuwPr3MS4bHxaXqWX49QGZLYkyjG8ANP/l9y3MY14ggxorLCDf8vvs+0bO8u9DUdLkvN1tfVroZaLRk1rrSq6jViADo3hvNJk6dkqFneaQxPDbZZDQn6jXCQHnpuT/RYCTmaIQBNFdFzNEIA2iuipijESLqz/w8D81VEfM0QsT7q4pM5qqIeRoh4oHJ6SZzkfHxerUZMYwdG7yUVzE56esSzNNgQMOIqJEYP/5jk5Zz1Og1lrkahvVqkfiTp60e9Y/O+tSk40S9BsMIsVocOtxsmp2BRQfrTRrJmdMzTXoNBjRMxatXvf15TktLWxxqJLlOA1B2tHmk3eWESPG1qaXxmIs64nPP7NSGOwFNU/Hs2VaT4Zs+rWjnGrosoUZDAfy3Bmn36sOECWmOGg0FrC4r1L7sjXxbM6UW2zVsUF3dEvgRJJOHDk/2bffmnjZdShCHD9Wl61cjwkDDmYul2KZhDd/E3FXzDLaHhMa6i3PkvzoYs8OYjqW/x9N2O8acsGDeZl9u6nuHEzAm8f6qosZhI5K9w8TY0lNKT2AcsXVTZY1PL3iu6fJxjFuhorz5ROL8zd6ZD2V7n0zc6s3JqjjRVH/J119Ly7Wcl5Z87htrWHdnebtPJz02O8d0PUcdx5qk4qSEGdmmnJKSlmjUIg7l1SetXlEozPBfzuTvyZac70x9vv3GflMfxIpjzetRS8jMONaAWqdzqalovhP1RLvfObp5wDomkJiu1VjAipSTt+eUqd2OYhYEGW41aBVLjjYFTmJfbk0exjnxLiknu/oe1NjpJR6dtdH3LUA9EbXTp2UF+YdxS8gBYAdInvPEoq2muIo8hwN1SBrP9pyqhDM1lyZgzIqyNhnm9nxkHmokJ09ea9ITnl+ca1nPFtgBUjUjUKMi5kjMfmSjSYukJ460lZcajCNnzsjybYfbGMfJx5O7rSoF45yq85eg8WE9R2AHSFWHqFERcyTS15SYtMhhbOXqOdv2HsaRfKWLMRWltqv6F57NtTwfrOcILI7kJ9/VHCLmSGStKzuMWk76gHdsqXZlCteOc3hej3qM2bH4yA/h/7GCRZGxI1NM5qFGRcyRKDrYYGs4cc+uk65M4drEBVtMcSTXY6wrjI//2PL8HIHFkCNiI2t4Wek5R8P376t1ZQrXLn5qhymO5HqMuWVx8bkevJ4jsAAy0oYfP97saPihgjpXpnDtkmc77x6syPUYc0O5duD1HIFFkLGjImv498dbHA0/evgHV6ZwrVvD31laYIq7pSvTMRkZO8r8pzBqVMQcieIjZx0N//aYJ2TDn35iuymO5HoCxkMh1rQEJiJDmeF2n/hXBc4/mqkfFAc9S8E4kmsXzfc/j7Ej10ukJB055Gb1jdy+qbIdayqBiciRitceUIO0Mzx/7ylHw9OSS0M2XPUsCMn1iKEdq1VJzLXiKy/utq0bACYiQzGciDkSYtnuaHhmWnnIhs962P41DtRbTY7GxiujMc+ORwobIzPDR49xb7jVSRAyP7Ff+BBzMitCNnz6tExTHMn1dIz3/QjMVxFzLIGJyFBnuMBNmEdIWun8MuiWnKqQDZ840f9fqx25no5pghzIP7OStyOwBqerP9ExGal6dQ01KpYcaFA+D586db3jo+G05NB/NEeIlTHGkVxv1Y7AGpwF+ac3oN4STj8MOMMfX+i8dCbSv0U8TwJ1KvLHCSuWHazFOLKq8vxyqXc6H2LCzA2B+hiT7RziWzkEdZILxV0R6m2BBZDy5BPnd81oFSm/K0aESzd9yLuQB6esU8bWfHh0ZF1d691x46xfJQl20gUKCmoHYzFJnOH/NWRnlJt+5Pfn1W68f1Lwe/D0jZ2VkO3dubl6MNfaIj2181k0Xegrvz2fJGM7t1V70Oz/g+ElX3smXbhwoRe2hw00UvLdFYUBQ5e99eV5jEvDexuDaHsD7UcZMe29jejAddMtOmqZjnsZgw5SbR5TAfNlm2xXxZ0g8ztyb1TF+Rbbg9DsaStDIzm5FmN8aY+d8pOMMvqPp/1eRkwbxvztAy92tM3lsc549JwoY8AX/lrRO2kr2i5RO8WjjIG/Yf8cfs2AEz2MAeOwtqjnoX0xhmIRHytjPY3+Q7kO98WH/xf26a8X0y7G8zvmBeD0Y1Jf2zrXSjtpYudrAP7i/WLEicXRsTiB2bLDnkbMNXliHbElqsHyrQQd9zQGnhZcRMcqw3ke5mMseD/mJYwJw/7EGvyY9nsZtw8Wpr5C+WIMv2LfuA0Cmog89d2FCqnl7ZT3xe6aQEExeyt5B8LUpXJfguI9jeghhnHbHWLAvsUEDg4HGdzet084hvN91NExJ8Zo28eIeZ32bzF630VjwbjVNghz59g/0JG6tJRvfkTDeR2C+cT8g+ptDNxMx2SQjMmvLA5OzOSF5jrB+7Slr7+d4eID/RHz/O3RhbydxaIEbxb9Py7qFkiN1NFlIsoY1E+2yW9CDyN6DPaNWxPQZMlEsZCheFPT5UfQ7Fdf3n0F6/zTEB/iIvFNK8f2fx3efC3/D24oLa/r61t9s7OxsfFWNFvcLn2ANTRcgl5OlKbSM4etn1UVJSRsCHwAMlZ0oCEyb4RqdCI9pSRj+ZsF7Yuf3NG+ekVh+6mTv2SgRkNDQyMYfwN6fAMrBOuVigAAAABJRU5ErkJggg==>